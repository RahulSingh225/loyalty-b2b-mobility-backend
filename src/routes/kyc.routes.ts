import { Router } from 'express';
import {
    submitKycDocument,
    submitKycDocumentsBulk,
    getKycStatus,
    getKycDocument,
    resubmitKycDocument,
    getKycHistory,
    verifyPan,
    verifyGst,
    verifyBankAccount,
    verifyRegistrationBankAccount,
    verifyUpi,
    initiateDigilockerVerification,
    fetchDigilockerDetails,
    tdsConsent
} from '../controllers/kyc.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { uploadSingle, uploadMultiple, uploadAnyFields } from '../middlewares/upload';
import { authorizeRoles } from '../middlewares/authorize';
import { validateBody, VerifyGstSchema, VerifyBankAccountSchema, VerifyUpiSchema } from '../middlewares/zod';

const router = Router();

// router.post('/submit', authenticate, uploadSingle, submitKycDocument);
router.post('/submit-bulk', authenticate, uploadAnyFields, asyncHandler(submitKycDocumentsBulk));
router.get('/status', authenticate, getKycStatus);
router.get('/documents/:documentType', authenticate, getKycDocument);
router.put('/documents/:documentType', authenticate, uploadSingle, resubmitKycDocument);
router.get('/history', authenticate, getKycHistory);

// PAN verification route
router.post('/verify-pan', authenticate, asyncHandler(verifyPan));

// GST verification route
router.post('/verify-gst', authenticate, authorizeRoles(['Retailer']), validateBody(VerifyGstSchema), asyncHandler(verifyGst));

// Bank account verification route (Does NOT update blockStatus)
router.post('/verify-bank-account', authenticate, validateBody(VerifyBankAccountSchema), asyncHandler(verifyBankAccount));

// UPI verification route
router.post('/verify-upi', authenticate, validateBody(VerifyUpiSchema), asyncHandler(verifyUpi));

// Registration Bank account verification route (Updates blockStatus)
router.post('/registrations/verify-bank-account', authenticate, authorizeRoles(['Retailer']), validateBody(VerifyBankAccountSchema), asyncHandler(verifyRegistrationBankAccount));

// DigiLocker verification routes
router.post('/digilocker/initiate', authenticate, asyncHandler(initiateDigilockerVerification));
router.get('/digilocker/fetch', authenticate, asyncHandler(fetchDigilockerDetails));

router.get("/tds-consent", authenticate, asyncHandler(tdsConsent));
export default router;
