import { Router } from 'express';
import { approveKyc, getProfile, updateProfile, updateRegistrationProfile, getReferralsHistory, listUsersWithRoleFilter, deleteProfile } from '../controllers/user.controller';
import {
    createAssociation,
    getAssociations,
    updateAssociationStatus,
    deleteAssociation,
    getAssociationById
} from '../controllers/userAssociation.controller';
import { authenticate, authenticateUnified } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { authorizeRoles } from '../middlewares/authorize';
import { validateBody, CreateAssociationSchema, UpdateAssociationStatusSchema } from '../middlewares/zod';

const router = Router();

import { uploadProfilePhoto } from '../middlewares/upload';

// User profile routes
router.post('/kyc/approve', approveKyc);
router.get('/profile', authenticateUnified, getProfile);
router.put('/profile', authenticate, uploadProfilePhoto, asyncHandler(updateProfile));
router.put('/registrations/profile', authenticate, uploadProfilePhoto, asyncHandler(updateRegistrationProfile));
router.delete('/profile', authenticate, asyncHandler(deleteProfile));
router.get('/referrals/history', authenticate, getReferralsHistory);
router.get('/list', authenticate, authorizeRoles(['Counter Staff']), listUsersWithRoleFilter);

// User association routes (counter staff to retailer mapping)
router.post('/associations', authenticate, authorizeRoles(['Counter Staff']), validateBody(CreateAssociationSchema), asyncHandler(createAssociation));
router.get('/associations', authenticate, asyncHandler(getAssociations));
router.get('/associations/:id', authenticate, asyncHandler(getAssociationById));
router.put('/associations/:id/status', authenticate, validateBody(UpdateAssociationStatusSchema), asyncHandler(updateAssociationStatus));
router.delete('/associations/:id', authenticate, asyncHandler(deleteAssociation));

export default router;
