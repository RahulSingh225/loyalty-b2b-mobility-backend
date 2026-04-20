import { Request, Response } from 'express';
import { userAssociationService } from '../services/userAssociationService';
import { success } from '../utils/response';
import db from '../config/db';
import { users, retailers, userTypeEntity } from '../schema';
import { eq, or } from 'drizzle-orm';
import { cacheMaster } from '../utils/masterCache';
import * as schema from '../schema';
import { z } from 'zod';
import { CreateAssociationSchema, UpdateAssociationStatusSchema } from '../middlewares/zod';
// import { logger } from '../utils/logger';

/**
 * Create a new association between counter staff and retailer
 * Counter staff user maps themselves to a retailer
 * @route POST /api/v1/users/associations
 */
export const createAssociation = async (req: Request, res: Response) => {
    const user = (req as any).user;

    // Validate request body with Zod schema
    try {
        const validatedData = CreateAssociationSchema.parse(req.body);
        const { retailerUserId } = validatedData;

        const counterStaffUserId = user.id;

        // Ensure that retailer association is only attempted if the user role is 'RETAILER'
        // Check To retailers table and match ID
        const [retailerRecord] = await db
            .select({
                userId: retailers.userId,
                id: retailers.id
            })
            .from(retailers)
            .where(or(
                eq(retailers.userId, retailerUserId),
                eq(retailers.id, retailerUserId)
            ))
            .limit(1);

        if (!retailerRecord) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid user role for retailer. Retailer not found.' }
            });
        }

        // Ensure we pass the actual users.id
        const actualRetailerUserId = retailerRecord.userId;

        const association = await userAssociationService.requestRetailerAssociation(actualRetailerUserId, counterStaffUserId);

        res.json(success(association, 'Association created successfully with inactive status'));
    } catch (error: any) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                }
            });
        }

        // Handle other errors
        return res.status(400).json({
            success: false,
            error: { message: error.message || 'Failed to create association' }
        });
    }
};

/**
 * Get all associations for the authenticated user
 * @route GET /api/v1/users/associations
 * 
 * Query Parameters:
 * - asParent: 'true' (default) for retailers to get their counter staff, 'false' for counter staff to get their retailer
 * - associationType: Filter by type (e.g., 'counter_staff_to_retailer')
 * 
 * Usage:
 * - Retailers: GET /users/associations?asParent=true (lists all counter staff associated with them)
 * - Counter Staff: GET /users/associations?asParent=false (lists the retailer they're associated with)
 */
export const getAssociations = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { asParent, associationType, status } = req.query;

    let statusFilter: string | string[] | undefined = status as string | undefined;

    // Support generic 'Pending' mapping
    if (status === 'Pending') {
        statusFilter = ['CSB_PENDING_APPROVAL', 'TDS_CONSENT_PENDING', 'KYC_PENDING', 'inactive'];
    }

    const associations = await userAssociationService.getUserAssociations(
        user.id,
        asParent === 'true' || asParent === undefined, // Default to parent view
        associationType as string | undefined,
        statusFilter
    );

    res.json(success({ associations, total: associations.length }));
};

/**
 * Update association status
 * @route PUT /api/v1/users/associations/:id/status
 */
export const updateAssociationStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;

    try {
        // Validate request body with Zod schema
        const validatedData = UpdateAssociationStatusSchema.parse(req.body);
        const { status } = validatedData;

        // Get the association being updated
        const association = await userAssociationService.getAssociationById(parseInt(id));

        if (!association) {
            return res.status(404).json({
                success: false,
                error: { message: 'Association not found' }
            });
        }

        // Strict validation: Enforce one-way status transition flow
        // Flow: inactive → (active OR rejected) → deactive
        // rejected is also a final state
        const currentStatus = association.status;

        // Define valid transitions
        const validTransitions: Record<string, string[]> = {
            'inactive': ['active', 'rejected', 'KYC_PENDING'],
            'KYC_PENDING': ['TDS_CONSENT_PENDING', 'rejected', 'CSB_REJECTED'],
            'TDS_CONSENT_PENDING': ['CSB_PENDING_APPROVAL', 'rejected', 'CSB_REJECTED'],
            'active': ['deactive'],              // Can only deactivate after active
            'rejected': [],                       // Final state, cannot change
            'deactive': [],                       // Final state, cannot change
            'CSB_PENDING_APPROVAL': ['CSB_APPROVED', 'CSB_REJECTED'],
            'CSB_APPROVED': ['CSB_ACTIVE', 'CSB_INACTIVE'],
            'CSB_ACTIVE': ['CSB_INACTIVE'],
            'CSB_INACTIVE': ['CSB_ACTIVE'],
            'CSB_REJECTED': []
        };

        // Backend (MANDATORY SAFETY CHECK):
        if (status === 'CSB_APPROVED' || status === 'CSB_REJECTED') {
            const childUser = await db.select({
                approvalStatusId: users.approvalStatusId
            }).from(users).where(eq(users.id, association.childUserId)).limit(1);

            const [childApprovalStatus] = await db.select({
                name: schema.approvalStatuses.name
            }).from(schema.approvalStatuses).where(eq(schema.approvalStatuses.id, childUser[0].approvalStatusId)).limit(1);

            if (childApprovalStatus?.name !== "CSB_PENDING_APPROVAL") {
                return res.status(403).json({
                    success: false,
                    error: { message: 'CSB approval not allowed before completing required steps' }
                });
            }
        }

        // Check if the transition is valid
        const allowedNextStatuses = validTransitions[currentStatus] || [];

        if (!allowedNextStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid status transition',
                    details: `Cannot change from '${currentStatus}' to '${status}'. Valid transitions from '${currentStatus}': ${allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none (final state)'}`
                }
            });
        }

        // Authorization check: Only retailer can activate an association or manage CSB
        const retailerOnlyStatuses = ['active', 'CSB_APPROVED', 'CSB_REJECTED', 'CSB_ACTIVE', 'CSB_INACTIVE'];
        if (retailerOnlyStatuses.includes(status)) {
            // Check if the authenticated user is the retailer (parent) of this association
            if (user.id !== association.parentUserId) {
                return res.status(403).json({
                    success: false,
                    error: {
                        message: 'Only the associated Retailer can perform this action',
                        details: 'Counter staff cannot activate or approve their own association.'
                    }
                });
            }
        }

        // Authorization check: Only retailer or counter staff can modify association
        const isRetailer = user.id === association.parentUserId;
        const isCounterStaff = user.id === association.childUserId;

        if (!isRetailer && !isCounterStaff) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Unauthorized to modify this association',
                    details: 'Only the retailer or counter staff involved in this association can modify its status.'
                }
            });
        }

        const updatedAssociation = await userAssociationService.updateAssociationStatus(
            parseInt(id),
            status
        );

        res.json(success(updatedAssociation, 'Association status updated successfully'));
    } catch (error: any) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                }
            });
        }

        // Handle other errors
        return res.status(404).json({
            success: false,
            error: { message: error.message || 'Association not found' }
        });
    }
};

/**
 * Delete an association
 * @route DELETE /api/v1/users/associations/:id
 */
export const deleteAssociation = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const association = await userAssociationService.deleteAssociation(parseInt(id));

        res.json(success(association, 'Association deleted successfully'));
    } catch (error: any) {
        return res.status(404).json({
            success: false,
            error: { message: error.message || 'Association not found' }
        });
    }
};

/**
 * Get a specific association by ID
 * @route GET /api/v1/users/associations/:id
 */
export const getAssociationById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const association = await userAssociationService.getAssociationById(parseInt(id));

    if (!association) {
        return res.status(404).json({
            success: false,
            error: { message: 'Association not found' }
        });
    }

    res.json(success(association));
};
