import { Router } from 'express';
import { requestRedemption, getRedemptionHistory, getRedemptionDetail, getRedemptionStats, placeOrder, orderStatus } from '../controllers/redemption.controller';
import { getRedemptionTypes } from '../controllers/redemption.controller';
import { authenticate, authenticateGyftr } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { handleWebhook } from '../controllers/razorpay.webhook.controller';
import { getGyftrSession } from '../controllers/gyftr.controller';

import { handleGyftrWebhook } from '../controllers/gyftr.webhook.controller';

const router = Router();
router.post('/', requestRedemption);
router.post('/request', authenticate, asyncHandler(requestRedemption));
router.post('/webhooks/razorpay', asyncHandler(handleWebhook));
router.post('/session/gyftr', authenticate, asyncHandler(getGyftrSession));
router.post('/gyftr/placeOrder', authenticateGyftr, asyncHandler(placeOrder));
router.post('/gyftr/orderStatus', asyncHandler(orderStatus));
router.post('/webhooks/gyftr', asyncHandler(handleGyftrWebhook));
router.get('/types', getRedemptionTypes);
router.get('/history', authenticate, getRedemptionHistory);
router.get('/stats', authenticate, getRedemptionStats);
router.get('/:id', authenticate, getRedemptionDetail);

export default router;
