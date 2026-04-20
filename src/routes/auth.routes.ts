import { Router } from 'express';
import { register, refresh, logout, verifyKyc } from '../controllers/auth.controller';
import { loginWithPassword, loginWithOtp, sendOtp, verifyOtp, resetPasswordRequest, resetPasswordConfirm, sendRegistrationOtp, verifyRegistrationOtp, setPin, loginWithPin } from '../controllers/auth.controller';
import { asyncHandler } from '../middlewares/errorHandler';
import { authenticate } from '../middlewares/auth';
import { logActivity } from '../middlewares/activityLogger';
// import { validateBody, OnboardingInputSchema } from '../middlewares/zod';

const router = Router();

router.post('/login/password', asyncHandler(loginWithPassword));
router.post('/login/pin', asyncHandler(loginWithPin));
router.post('/set-pin', authenticate, asyncHandler(setPin));
router.post('/otp/send', asyncHandler(sendOtp));
router.post('/otp/verify', asyncHandler(verifyOtp));
router.post('/reset/confirm', asyncHandler(resetPasswordConfirm));
router.post('/register', logActivity('REGISTER_USER', 'AUTH'), asyncHandler(register));
// Registration OTP routes (require authentication)
router.post('/registration/otp/send', authenticate, asyncHandler(sendRegistrationOtp));
router.post('/registration/otp/verify', authenticate, asyncHandler(verifyRegistrationOtp));
// router.post('/reset/request', resetPasswordRequest);
// router.post('/refresh', refresh);
// router.post('/logout', logout);

export default router;
