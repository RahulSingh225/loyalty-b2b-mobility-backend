import { Router } from 'express';
import { scanQr } from '../controllers/transaction.controller';

const router = Router();
router.post('/scan', scanQr);

export default router;
