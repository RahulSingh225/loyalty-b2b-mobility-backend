import { Router } from 'express';
import { approveKyc, getProfile, updateProfile, getReferralsHistory } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.post('/kyc/approve', approveKyc);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/referrals/history', authenticate, getReferralsHistory);
export default router;
