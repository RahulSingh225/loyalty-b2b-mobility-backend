import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';
import { loginWithPassword, loginWithOtp, sendOtp, verifyOtp, resetPasswordRequest, resetPasswordConfirm } from '../controllers/auth-otp.controller';

const router = Router();
// Classic auth
router.post('/login', login);
router.post('/register', register);
// OTP/password auth
router.post('/login/password', loginWithPassword);
router.post('/login/otp', loginWithOtp);
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
router.post('/reset/request', resetPasswordRequest);
router.post('/reset/confirm', resetPasswordConfirm);

export default router;
