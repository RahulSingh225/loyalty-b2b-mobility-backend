import { Router } from 'express';
import { login, register, refresh, logout, verifyKyc } from '../controllers/auth.controller';
import { loginWithPassword, loginWithOtp, sendOtp, verifyOtp, resetPasswordRequest, resetPasswordConfirm } from '../controllers/auth.controller';
import { asyncHandler } from '../middlewares/errorHandler';
import { authenticate } from '../middlewares/auth';

const router = Router();
// Classic auth
router.post('/login', login);

// OTP/password auth
router.post('/login/password', loginWithPassword);
router.post('/login/otp', loginWithOtp);
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
router.post('/reset/request', resetPasswordRequest);
router.post('/reset/confirm', resetPasswordConfirm);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/register', asyncHandler(register));
router.post('/kyc/verify', authenticate,asyncHandler(verifyKyc));
export default router;
