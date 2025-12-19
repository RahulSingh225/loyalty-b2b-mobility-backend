import { Router } from 'express';
import { requestRedemption } from '../controllers/redemption.controller';

const router = Router();
router.post('/', requestRedemption);

export default router;
