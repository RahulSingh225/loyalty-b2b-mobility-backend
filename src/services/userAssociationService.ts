import { BaseService } from './baseService';
import { userAssociations, users, userTypeEntity, approvalStatuses, retailers, counterSales } from '../schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import db from '../config/db';
import { cacheMaster } from '../utils/masterCache';
import { AppError } from '../middlewares/errorHandler';
import { APPROVAL_STATUS } from '../utils/approvalStatus';
import { S3Connector } from '../connectors/s3Connector';

const s3 = new S3Connector();

class UserAssociationService extends BaseService<typeof userAssociations> {
    /**
     * Create a new user association (e.g., map counter staff to retailer)
     * @param parentUserId - The parent user ID (e.g., retailer user ID)
     * @param childUserId - The child user ID (e.g., counter staff user ID)
     * @param associationType - Type of association (e.g., 'counter_staff_to_retailer')
     * @param status - Status of association (default: 'inactive')
     * @param metadata - Additional metadata
     * @returns Created association
     */
    async createAssociation(
        parentUserId: number,
        childUserId: number,
        associationType: string,
        status: string = 'inactive',
        metadata: Record<string, any> = {}
    ) {
        // Check if an association already exists
        const [existing] = await db
            .select()
            .from(userAssociations)
            .where(
                and(
                    eq(userAssociations.parentUserId, parentUserId),
                    eq(userAssociations.childUserId, childUserId),
                    eq(userAssociations.associationType, associationType)
                )
            )
            .limit(1);

        // If association exists and is not in a final state (deactive or rejected), block creation
        const finalStates = ['deactive', 'rejected', 'CSB_REJECTED'];
        if (existing && !finalStates.includes(existing.status)) {
            throw new AppError(`Association already exists between these users with status: ${existing.status}`, 409, 1003);
        }

        // If a final state association exists (deactive or rejected), reuse it by resetting to inactive
        if (existing && finalStates.includes(existing.status)) {
            const [reactivated] = await db
                .update(userAssociations)
                .set({
                    status: 'inactive',
                    metadata,
                    updatedAt: new Date().toISOString()
                })
                .where(eq(userAssociations.id, existing.id))
                .returning();

            return reactivated;
        }

        // Validate that both users exist
        const [parentUser] = await db.select().from(users).where(eq(users.id, parentUserId)).limit(1);
        const [childUser] = await db.select().from(users).where(eq(users.id, childUserId)).limit(1);

        if (!parentUser) {
            throw new AppError('Parent user not found', 404, 1004);
        }

        if (!childUser) {
            throw new AppError('Child user not found', 404, 1005);
        }

        // Create new association (only if no existing one)
        const [association] = await db
            .insert(userAssociations)
            .values({
                parentUserId,
                childUserId,
                associationType,
                status,
                metadata,
            })
            .returning();

        return association;
    }

    /**
     * Get all associations for a user
     * @param userId - User ID
     * @param asParent - If true, get associations where user is parent; if false, where user is child
     * @param associationType - Optional filter by association type
     * @returns List of associations
     */
    async getUserAssociations(
        userId: number,
        asParent: boolean = true,
        associationType?: string,
        status?: string | string[]
    ) {
        const conditions = [
            asParent
                ? eq(userAssociations.parentUserId, userId)
                : eq(userAssociations.childUserId, userId),
        ];

        if (associationType) {
            conditions.push(eq(userAssociations.associationType, associationType));
        }

        if (status) {
            if (Array.isArray(status)) {
                conditions.push(inArray(userAssociations.status, status));
            } else {
                conditions.push(eq(userAssociations.status, status));
            }
        }

        const parentUser = alias(users, "parent_user");
        const childUser = alias(users, "child_user");

        const results = await db
            .select({
                association: userAssociations,
                parentUser: {
                    id: parentUser.id,
                    name: parentUser.name,
                    phone: parentUser.phone,
                    roleId: parentUser.roleId,
                    email: parentUser.email,
                    profilePhotoUrl: parentUser.profilePhotoUrl
                },
                childUser: {
                    id: childUser.id,
                    name: childUser.name,
                    phone: childUser.phone,
                    roleId: childUser.roleId,
                    email: childUser.email,
                    blockStatus: approvalStatuses.name,
                    profilePhotoUrl: childUser.profilePhotoUrl
                }
            })
            .from(userAssociations)
            .leftJoin(parentUser, eq(userAssociations.parentUserId, parentUser.id))
            .leftJoin(childUser, eq(userAssociations.childUserId, childUser.id))
            .leftJoin(approvalStatuses, eq(childUser.approvalStatusId, approvalStatuses.id))
            .where(and(...conditions));

        const response = await Promise.all(results.map(async (row) => {
            let childProfilePhotoUrl = '';

            if (row.childUser && row.childUser.profilePhotoUrl) {
                try {
                    childProfilePhotoUrl = await s3.getSignedUrl(row.childUser.profilePhotoUrl);
                } catch (error) {
                    console.error(`Failed to sign URL for child user ${row.childUser.id}:`, error);
                    // Keep as empty string on error
                }
            }

            // Optionally do the same for parent user if needed in future

            return {
                ...row.association,
                parentUser: row.parentUser,
                childUser: {
                    ...row.childUser,
                    profilePhotoUrl: childProfilePhotoUrl
                }
            };
        }));

        return response;
    }

    /**
     * Update association status
     * @param associationId - Association ID
     * @param status - New status
     * @returns Updated association
     */
    async updateAssociationStatus(associationId: number, status: string) {
        return await db.transaction(async (tx) => {
            const [updated] = await tx
                .update(userAssociations)
                .set({ status, updatedAt: new Date().toISOString() })
                .where(eq(userAssociations.id, associationId))
                .returning();

            if (!updated) {
                throw new Error('Association not found');
            }

            const [statusRecord] = await tx
                .select({ id: approvalStatuses.id })
                .from(approvalStatuses)
                .where(eq(approvalStatuses.name, status));

            if (statusRecord) {
                await tx
                    .update(users)
                    .set({ approvalStatusId: statusRecord.id })
                    .where(eq(users.id, updated.childUserId));
            }

            return updated;
        });
    }

    /**
     * Delete an association
     * @param associationId - Association ID
     * @returns Deleted association
     */
    async deleteAssociation(associationId: number) {
        const [deleted] = await db
            .delete(userAssociations)
            .where(eq(userAssociations.id, associationId))
            .returning();

        if (!deleted) {
            throw new Error('Association not found');
        }

        return deleted;
    }

    /**
     * Get a specific association by ID
     * @param associationId - Association ID
     * @returns Association or null
     */
    async getAssociationById(associationId: number) {
        const [association] = await db
            .select()
            .from(userAssociations)
            .where(eq(userAssociations.id, associationId))
            .limit(1);

        return association || null;
    }
    /**
     * Request an association with a retailer (initiated by counter staff)
     * Performs strict validation:
     * 1. Validates retailer user exists and has 'Retailer' role
     * 2. constraints: Counter staff can only have ONE active/inactive association
     */
    async requestRetailerAssociation(retailerIdOrUserId: number, counterStaffUserId: number) {
        try {
            console.log(`[UserAssociationService] Requesting association: RetailerID/UserID: ${retailerIdOrUserId}, CounterStaffUserID: ${counterStaffUserId}`);

            // 1. Resolve the actual retailer userId from the retailers table
            // We search by either retailers.id or retailers.userId to be robust
            const [retailerRecord] = await db
                .select({
                    userId: retailers.userId,
                    id: retailers.id
                })
                .from(retailers)
                .where(or(
                    eq(retailers.id, retailerIdOrUserId),
                    eq(retailers.userId, retailerIdOrUserId)
                ))
                .limit(1);

            if (!retailerRecord) {
                console.error(`[UserAssociationService] Retailer record not found for: ${retailerIdOrUserId}`);
                throw new AppError('The specified retailer account could not be found.', 404, 1000);
            }

            const retailerUserId = retailerRecord.userId;

            // 2. Validate that retailerUserId has the 'Retailer' role
            const [retailerUser] = await db
                .select()
                .from(users)
                .where(eq(users.id, retailerUserId))
                .limit(1);

            if (!retailerUser) {
                throw new AppError('Retailer user not found', 404, 1000);
            }

            const userTypes = await db.select().from(userTypeEntity).execute();
            const retailerRole = userTypes.find((type) => type.id === retailerUser.roleId);

            if (!retailerRole || retailerRole.typeName !== 'Retailer') {
                console.error(`[UserAssociationService] Role validation failed: User ${retailerUserId} is not a Retailer (Role: ${retailerRole?.typeName})`);
                throw new AppError(`The specified user is not a retailer.`, 400, 1001);
            }

            // 3. Check for existing active/pending associations for this CSB
            const existingAssociations = await this.getUserAssociations(
                counterStaffUserId,
                false, // as child
                'counter_staff_to_retailer'
            );

            const activeOrPendingStatusCodes = [
                APPROVAL_STATUS.CSB_PENDING_APPROVAL,
                APPROVAL_STATUS.CSB_APPROVED,
                APPROVAL_STATUS.CSB_ACTIVE,
                'active',
                'inactive'
            ];

            const activeOrPending = existingAssociations.filter(a => activeOrPendingStatusCodes.includes(a.status));
            if (activeOrPending.length > 0) {
                throw new AppError(`You already have an active retailer association.`, 400, 1002);
            }

            // 4. Update the counter_sales record to store the attachedRetailerId (users.id)
            // This is Task 1 from the user's requirements
            await db.update(counterSales)
                .set({
                    attachedRetailerId: retailerUserId
                })
                .where(eq(counterSales.userId, counterStaffUserId));

            console.log(`[UserAssociationService] Updated counter_sales.attachedRetailerId for CSB: ${counterStaffUserId} to Retailer UserID: ${retailerUserId}`);

            // 5. Create the association with 'CSB_PENDING_APPROVAL' status
            return await this.createAssociation(
                retailerUserId,
                counterStaffUserId,
                'counter_staff_to_retailer',
                APPROVAL_STATUS.CSB_PENDING_APPROVAL,
                {
                    createdBy: counterStaffUserId,
                    createdAt: new Date().toISOString(),
                    metadata: {
                        source: 'CSB_KYC_FLOW',
                        resolvedRetailerId: retailerRecord.id
                    }
                }
            );
        } catch (error: any) {
            console.error(`[UserAssociationService] requestRetailerAssociation failed:`, error);
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to create retailer association', 500);
        }
    }
}

export const userAssociationService = new UserAssociationService(userAssociations as any);
