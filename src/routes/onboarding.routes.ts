import express from 'express';
import { registerUser, verifyKyc } from '../controllers/onboarding.controller';
import { asyncHandler } from '../middlewares/errorHandler';

const router = express.Router();

router.post('/register', asyncHandler(registerUser));
router.post('/kyc/verify', asyncHandler(verifyKyc));

export default router;
