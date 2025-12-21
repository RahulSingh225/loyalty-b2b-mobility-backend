import { Router } from 'express';
import { submitKycDocument, getKycStatus, getKycDocument, resubmitKycDocument, getKycHistory } from '../controllers/kyc.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/submit', authenticate, submitKycDocument);
router.get('/status', authenticate, getKycStatus);
router.get('/documents/:documentType', authenticate, getKycDocument);
router.put('/documents/:documentType', authenticate, resubmitKycDocument);
router.get('/history', authenticate, getKycHistory);

export default router;
