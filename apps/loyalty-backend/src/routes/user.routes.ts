import { Router } from 'express';
import { approveKyc } from '../controllers/user.controller';

const router = Router();
router.post('/kyc/approve', approveKyc);

export default router;
