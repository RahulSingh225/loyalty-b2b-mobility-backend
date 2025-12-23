import { Router } from 'express';
import { requestRedemption, getRedemptionHistory, getRedemptionDetail, getRedemptionStats } from '../controllers/redemption.controller';
import { getRedemptionTypes } from '../controllers/redemption.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.post('/', requestRedemption);
router.post('/request', requestRedemption);
router.get('/types', getRedemptionTypes);
router.get('/history', authenticate, getRedemptionHistory);
router.get('/stats', authenticate, getRedemptionStats);
router.get('/:id', authenticate, getRedemptionDetail);

export default router;
