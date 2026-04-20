import express from 'express';
import { scanQr, getEarningHistory, getEarningDetail, getPassbook, getLedgerHistory } from '../controllers/earning.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = express.Router();

router.post('/scan', authenticate, asyncHandler(scanQr));
router.get('/history', authenticate, asyncHandler(getEarningHistory));
router.get('/history/:id', authenticate, asyncHandler(getEarningDetail));
router.get('/passbook', authenticate, asyncHandler(getPassbook));
router.get('/ledger', authenticate, asyncHandler(getLedgerHistory) as any);

export default router;
