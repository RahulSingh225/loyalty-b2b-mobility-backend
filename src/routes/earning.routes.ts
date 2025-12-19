import express from 'express';
import { scanQr } from '../controllers/earning.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = express.Router();

router.post('/scan', authenticate, asyncHandler(scanQr));

export default router;
