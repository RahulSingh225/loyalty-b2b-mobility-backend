import { NextFunction, Request, Response } from 'express';
import { kycDocumentService } from '../services/kycDocumentService';
import { kycService } from '../services/kyc.service';
import { userAssociationService } from '../services/userAssociationService';
import { success } from '../utils/response';
import db from '../config/db';
import { InferSelectModel, eq, or, and, ne } from 'drizzle-orm';
import { users, retailers, electricians, counterSales, userAssociations, approvalStatuses as approvalStatusesSchema } from '../schema';
import { VerifyPanSchema, VerifyPanInput, VerifyGstInput, VerifyBankAccountInput, VerifyUpiInput } from '../middlewares/zod';
import { AppError } from '../middlewares/errorHandler';
import { KycVerificationResult } from '../types/kyc.types';
import { cacheMaster } from '../utils/masterCache';
import { APPROVAL_STATUS } from '../utils/approvalStatus';
import { log } from 'console';

type User = InferSelectModel<typeof users>;

const getApprovalStatusId = async (name: string) => {
  /* const statuses = await cacheMaster('approvalStatuses', async () => db.select().from(approvalStatusesSchema).execute()); */
  const statuses = await db.select().from(approvalStatusesSchema).execute();
  return statuses.find((s: any) => s.name === name)?.id;
};

export const submitKycDocument = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { documentType, documentValue } = req.body;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!documentType) {
    return res.status(400).json({ success: false, error: { message: 'Document type is required' } });
  }

  // Either documentValue or file must be provided
  if (!documentValue && !file) {
    return res.status(400).json({ success: false, error: { message: 'Document value or file is required' } });
  }

  const canResubmit = await kycDocumentService.canUserResubmit(user.id, documentType);
  if (!canResubmit) {
    return res.status(400).json({ success: false, error: { message: 'Document already submitted and pending verification' } });
  }

  let document;

  if (file) {
    if (documentValue) {
      // Both file and document value provided
      document = await kycDocumentService.submitDocument(
        user.id,
        documentType,
        documentValue,
        file.buffer,
        file.originalname,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
    } else {
      // Only file provided
      document = await kycDocumentService.submitDocumentFileOnly(
        user.id,
        documentType,
        file.buffer,
        file.originalname,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
    }
  } else {
    // Only document value provided
    document = await kycDocumentService.submitDocument(user.id, documentType, documentValue, undefined, undefined, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  res.json(success(document, 'Document submitted for verification'));
};

/**
 * Submit multiple KYC documents at once
 * Field names represent document types (e.g., AADHAAR_FRONT, AADHAAR_BACK, PAN)
 * @route POST /api/kyc/submit-bulk
 */
export const submitKycDocumentsBulk = async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const files = (req as any).files as Express.Multer.File[] | undefined;
console.log(`KYC Controllers:-${user}-${user.id}, ${files?.length}`);

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to check approvalStatus
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  // Determine user type by checking which master table contains this userId
  let userType: 'retailer' | 'electrician' | 'counter_sales' | null = null;

  const [retailer] = await db.select().from(retailers).where(eq(retailers.userId, user.id)).limit(1);
  if (retailer) {
    userType = 'retailer';
  } else {
    const [electrician] = await db.select().from(electricians).where(eq(electricians.userId, user.id)).limit(1);
    if (electrician) {
      userType = 'electrician';
    } else {
      const [counterSalesUser] = await db.select().from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
      if (counterSalesUser) {
        userType = 'counter_sales';
      }
    }
  }
  // Handle Retailer Association for Counter Sales
  // Handle Retailer Association for Counter Sales
  const { retailerUserId } = req.body as any;
  let associationResult: any = null;

  if (retailerUserId) {
    if (userType !== 'counter_sales') {
      associationResult = {
        success: false,
        error: 'Only Counter Sales staff can link to a Retailer'
      };
    } else {
      try {
        // Resolve the actual users.id from the retailers table (as frontend may send retailers.id)
        const [retailerRecord] = await db
          .select({ userId: retailers.userId, id: retailers.id })
          .from(retailers)
          .where(or(
            eq(retailers.id, Number(retailerUserId)),
            eq(retailers.userId, Number(retailerUserId))
          ))
          .limit(1);

        if (!retailerRecord) {
          associationResult = {
            success: false,
            errorMessage: 'Retailer account not found. Please check the retailer ID and try again.'
          };
        } else {
          console.log(`Retailer:-${retailerRecord.userId}, ${retailerRecord.id}, User:-${user.id}`);
          
          const result = await userAssociationService.requestRetailerAssociation(retailerRecord.userId, user.id);
          associationResult = {
            success: true,
            message: 'Association request submitted successfully',
            data: result
          };
        }
      } catch (error: any) {
        console.error('Failed to create association:', error);
        
        associationResult = {
          success: false,
          errorMessage: error.message || 'Failed to link with retailer',
          errorCode: error.appErrorCode
        };
      }
    }
  }

  // Validate approvalStatus based on user type
  // Retailers and others: expected 'KYC_PENDING' or 'PROFILE_UPDATED'
  const statuses = await db.select().from(approvalStatusesSchema).execute();
  const pendingId = statuses.find((s: any) => s.name === APPROVAL_STATUS.KYC_PENDING)?.id;
  const profileUpdatedId = statuses.find((s: any) => s.name === APPROVAL_STATUS.PROFILE_UPDATED)?.id;
  const onboardedId = statuses.find((s: any) => s.name === APPROVAL_STATUS.ONBOARDED)?.id;
  const validIds = [pendingId, profileUpdatedId, onboardedId].filter(id => id !== undefined);

  if (!validIds.includes(userData.approvalStatusId)) {
    const currentStatusName = statuses.find((s: any) => s.id === userData.approvalStatusId)?.name || 'Unknown';
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid user status for bulk document submission',
        details: `Current status: ${currentStatusName}. Expected: KYC_PENDING or PROFILE_UPDATED`
      }
    });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'At least one document file is required' }
    });
  }

  if (files.length > 5) {
    return res.status(400).json({
      success: false,
      error: { message: 'Maximum 5 documents can be uploaded at once' }
    });
  }

  const results: Array<{
    file: string;
    documentType: string;
    status: 'success' | 'failed';
    document?: any;
    error?: string;
  }> = [];

  // Process each file - field name is the document type
  for (const file of files) {
    const documentType = file.fieldname; // Field name represents document type

    try {
      // Validate document type
      if (!documentType) {
        results.push({
          file: file.originalname,
          documentType: 'unknown',
          status: 'failed',
          error: 'Document type (field name) is required for each file'
        });
        continue;
      }

      // Validate that document type is one of the allowed types
      const allowedDocumentTypes = ['AADHAAR_BACK', 'AADHAAR_FRONT', 'PAN', 'SHOP_IMAGE', 'GST_CERTIFICATE'];
      if (!allowedDocumentTypes.includes(documentType)) {
        results.push({
          file: file.originalname,
          documentType,
          status: 'failed',
          error: `Invalid document type. Allowed types: ${allowedDocumentTypes.join(', ')}`
        });
        continue;
      }

      // Submit document (file only)
      const document = await kycDocumentService.submitDocumentFileOnly(
        user.id,
        documentType,
        file.buffer,
        file.originalname,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );

      results.push({
        file: file.originalname,
        documentType,
        status: 'success',
        document
      });
    } catch (error: any) {
      // Provide user-friendly error messages
      let userErrorMessage = 'Failed to process document';
      
      if (error?.code === 'LIMIT_FILE_SIZE') {
        userErrorMessage = 'File size exceeds the maximum limit (e.g., 5MB). Please upload a smaller file.';
      } else if (error?.message?.includes('file')) {
        userErrorMessage = 'Document file could not be processed. Please ensure the file is valid and try again.';
      } else if (error?.message?.includes('resubmit')) {
        userErrorMessage = 'This document has already been submitted and is pending verification.';
      } else if (error?.statusCode === 400) {
        userErrorMessage = error.message || 'Invalid document format or data.';
      } else if (error?.statusCode === 409) {
        userErrorMessage = 'This document is already submitted and under review.';
      }
      
      results.push({
        file: file.originalname,
        documentType,
        status: 'failed',
        error: userErrorMessage
      });
    }
  }

  // Check if any documents were successfully submitted
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  // If at least one document submitted successfully, update user status to KYC_PENDING (if not already?)
  // Original was: 'pending_kyc_verification'
  if (successCount > 0) {
    try {
      if (pendingId) {
        await db.update(users)
          .set({ approvalStatusId: pendingId })
          .where(eq(users.id, user.id));

        // Sync association status for CSB
        const [counterUser] = await db.select().from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
        if (counterUser) {
          await db.update(userAssociations)
            .set({ status: 'KYC_PENDING', updatedAt: new Date().toISOString() })
            .where(eq(userAssociations.childUserId, user.id));
        }
      }
    } catch (error) {
      console.error('Failed to update user approval status:', error);
    }
  }

  res.json(success({
    association: associationResult,
    total: files.length,
    successful: successCount,
    failed: failedCount,
    results
  }, `${successCount} of ${files.length} documents submitted successfully`));
};

export const getKycStatus = async (req: Request, res: Response) => {
  const user = (req as any).user;

  // Always fetch documents with signed URLs if they exist
  const documents = await kycDocumentService.getAllDocumentsWithSignedUrls(user.id);

  // Fetch isKycVerified from the appropriate role table (represents in-person verification)
  let isKycVerified = false;
  const [retailerRow] = await db.select({ isKycVerified: retailers.isKycVerified }).from(retailers).where(eq(retailers.userId, user.id)).limit(1);
  if (retailerRow) {
    isKycVerified = retailerRow.isKycVerified ?? false;
  } else {
    const [electricianRow] = await db.select({ isKycVerified: electricians.isKycVerified }).from(electricians).where(eq(electricians.userId, user.id)).limit(1);
    if (electricianRow) {
      isKycVerified = electricianRow.isKycVerified ?? false;
    } else {
      const [counterSalesRow] = await db.select({ isKycVerified: counterSales.isKycVerified }).from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
      if (counterSalesRow) {
        isKycVerified = counterSalesRow.isKycVerified ?? false;
      }
    }
  }

  const status = {
    documents: documents.rows,
    overallStatus: documents.rows.length > 0 ? (documents.rows.every((d: any) => d.verificationStatus === 'verified') ? 'verified' : 'pending') : 'not_started',
    inPersonVerification: isKycVerified ? 'verified' : 'pending',
  };

  res.json(success(status));
};

export const getKycDocument = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { documentType } = req.params;
  const includeFileUrl = req.query.includeFileUrl === 'true';

  let document;
  if (includeFileUrl) {
    document = await kycDocumentService.getDocumentWithSignedUrl(user.id, documentType);
  } else {
    document = await kycDocumentService.getDocumentStatus(user.id, documentType);
  }

  if (!document) return res.status(404).json({ success: false, error: { message: 'Document not found' } });

  res.json(success(document));
};

export const resubmitKycDocument = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { documentType } = req.params;
  const { documentValue } = req.body;
  const file = (req as any).file as Express.Multer.File | undefined;

  // Either documentValue or file must be provided
  if (!documentValue && !file) {
    return res.status(400).json({ success: false, error: { message: 'Document value or file is required' } });
  }

  const canResubmit = await kycDocumentService.canUserResubmit(user.id, documentType);
  if (!canResubmit) {
    return res.status(400).json({ success: false, error: { message: 'Cannot resubmit this document at this time' } });
  }

  let document;

  if (file) {
    if (documentValue) {
      // Both file and document value provided
      document = await kycDocumentService.submitDocument(
        user.id,
        documentType,
        documentValue,
        file.buffer,
        file.originalname,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
    } else {
      // Only file provided
      document = await kycDocumentService.submitDocumentFileOnly(
        user.id,
        documentType,
        file.buffer,
        file.originalname,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
    }
  } else {
    // Only document value provided
    document = await kycDocumentService.submitDocument(user.id, documentType, documentValue, undefined, undefined, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  res.json(success(document, 'Document resubmitted for verification'));
};

export const getKycHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20 } = req.query;

  const opts = { page: parseInt(String(page)), pageSize: parseInt(String(pageSize)) };
  const result = await kycDocumentService.getKycHistory(user.id, opts);

  res.json(success(result));
};

// Adding explicit typing for request and response
export const verifyPan = async (req: Request<{}, {}, VerifyPanInput>, res: Response) => {
  const user: User = (req as any).user;
  const { panNumber } = VerifyPanSchema.parse(req.body);

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to check approvalStatus
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  // Validate approvalStatus is 'DIGILOCKER_COMPLETED' (mapped from digilocker)
  const statuses = await db.select().from(approvalStatusesSchema).execute();
  const digilockerId = statuses.find((s: any) => s.name === APPROVAL_STATUS.DIGILOCKER_COMPLETED)?.id;

  if (userData.approvalStatusId !== digilockerId) {
    const currentStatusName = statuses.find((s: any) => s.id === userData.approvalStatusId)?.name || 'Unknown';
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid user status for PAN verification',
        details: `Current status: ${currentStatusName}. Expected: DIGILOCKER_COMPLETED`
      }
    });
  }

  // Check if PAN already exists in any of the user tables (excluding current user)
  try {
    const [existingRetailer] = await db
      .select()
      .from(retailers)
      .where(and(eq(retailers.pan, panNumber), ne(retailers.userId, user.id)))
      .limit(1);
    const [existingElectrician] = await db
      .select()
      .from(electricians)
      .where(and(eq(electricians.pan, panNumber), ne(electricians.userId, user.id)))
      .limit(1);
    const [existingCounterSales] = await db
      .select()
      .from(counterSales)
      .where(and(eq(counterSales.pan, panNumber), ne(counterSales.userId, user.id)))
      .limit(1);
    if (existingRetailer || existingElectrician || existingCounterSales) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'PAN already exists in the system',
          details: 'This PAN number is already registered with another user'
        }
      });
    }
  } catch (error) {
    console.error('Error checking PAN existence:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to verify PAN uniqueness' }
    });
  }

  try {
    // Call the KYC service to verify PAN
    const result: KycVerificationResult = await kycService.verifyPanNumber(panNumber, user.id);

    if (!result.verified) {
      return res.status(200).json({
        success: false,
        verified: false,
        message: result.message || 'PAN verification failed'
      });
    }

    // Success - PAN is verified and active
    // Store PAN number in the appropriate user table
    try {
      const [retailer] = await db.select().from(retailers).where(eq(retailers.userId, user.id)).limit(1);

      if (retailer) {
        await db.update(retailers).set({ pan: panNumber }).where(eq(retailers.userId, user.id));
      } else {
        const [electrician] = await db.select().from(electricians).where(eq(electricians.userId, user.id)).limit(1);
        if (electrician) {
          await db.update(electricians).set({ pan: panNumber }).where(eq(electricians.userId, user.id));
        } else {
          const [counterSalesUser] = await db.select().from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
          if (counterSalesUser) {
            await db.update(counterSales).set({ pan: panNumber }).where(eq(counterSales.userId, user.id));
          }
        }
      }
    } catch (dbError) {
      console.error('Failed to update PAN number in user table:', dbError);
      // Don't fail the request as PAN verification was successful
    }

    res.json(success({
      verified: true
    }, 'PAN verification successful'));

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'PAN verification failed' }
    });
  }
};

/**
 * Verifies a GST number using Tenacio API
 * @route POST /api/kyc/verify-gst
 */
export const verifyGst = async (req: Request<{}, {}, VerifyGstInput>, res: Response) => {
  const user: User = (req as any).user;
  const { gstNumber } = req.body;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to check approvalStatus
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  // Validate approvalStatus is 'PAN_VERIFIED' (mapped from pan_verification)
  const statuses = await db.select().from(approvalStatusesSchema).execute();
  const panVerifiedId = statuses.find((s: any) => s.name === APPROVAL_STATUS.PAN_VERIFIED)?.id;

  if (userData.approvalStatusId !== panVerifiedId) {
    const currentStatusName = statuses.find((s: any) => s.id === userData.approvalStatusId)?.name || 'Unknown';
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid user status for GST verification',
        details: `Current status: ${currentStatusName}. Expected: PAN_VERIFIED`
      }
    });
  }

  try {
    // Call the KYC service to verify GST
    const result: KycVerificationResult = await kycService.verifyGstNumber(gstNumber, user.id);

    if (!result.verified) {
      return res.status(200).json({
        success: false,
        verified: false,
        message: result.message || 'GST verification failed'
      });
    }

    // Success - GST is verified and active
    res.json(success({
      verified: true,
      //gstData: result.data
    }, 'GST verification successful'));

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'GST verification failed' }
    });
  }
};

/**
 * Verifies a bank account using Tenacio API
 * @route POST /api/kyc/verify-bank-account
 */
export const verifyBankAccount = async (req: Request<{}, {}, VerifyBankAccountInput>, res: Response) => {
  const user: User = (req as any).user;
  const { accountNumber, ifscCode } = req.body;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Validate user exists (no specific status check enforced here in old logic either, 
  // except fetch user. But let's keep basic fetch)
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!userData) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }

  try {
    // Call the KYC service to verify bank account
    const result: KycVerificationResult = await kycService.verifyBankAccountDetails(accountNumber, ifscCode, user.id);

    if (!result.verified) {
      return res.status(200).json({
        success: false,
        verified: false,
        message: result.message || 'Bank account verification failed',
        data: result.data || null
      });
    }

    // Success - Bank account is verified
    // Update bank details in the appropriate user table
    try {
      const bankDetails = {
        bankAccountNo: accountNumber,
        bankAccountIfsc: ifscCode,
        bankAccountName: result.data?.fullName || '',
        isBankValidated: true,
      };

      const [retailer] = await db.select().from(retailers).where(eq(retailers.userId, user.id)).limit(1);

      if (retailer) {
        await db.update(retailers).set(bankDetails).where(eq(retailers.userId, user.id));
      } else {
        const [electrician] = await db.select().from(electricians).where(eq(electricians.userId, user.id)).limit(1);
        if (electrician) {
          await db.update(electricians).set(bankDetails).where(eq(electricians.userId, user.id));
        } else {
          const [counterSalesUser] = await db.select().from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
          if (counterSalesUser) {
            await db.update(counterSales).set(bankDetails).where(eq(counterSales.userId, user.id));
          }
        }
      }
    } catch (dbError) {
      console.error('Failed to update Bank details in user table:', dbError);
    }

    res.json(success({
      verified: true,
      bankData: result.data
    }, 'Bank details verified successfully'));

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Bank account verification failed' }
    });
  }
};

/**
 * Verifies a bank account using Tenacio API for Registration flow (updates status)
 * @route POST /api/kyc/registrations/verify-bank-account
 */
export const verifyRegistrationBankAccount = async (req: Request<{}, {}, VerifyBankAccountInput>, res: Response) => {
  const user: User = (req as any).user;
  const { accountNumber, ifscCode } = req.body;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to check status
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  // Validate status is 'GST_NUMBER_VERIFIED' (mapped from gst_number_verification)
  const statuses = await db.select().from(approvalStatusesSchema).execute();
  const gstVerifiedId = statuses.find((s: any) => s.name === APPROVAL_STATUS.GST_NUMBER_VERIFIED)?.id;

  if (userData.approvalStatusId !== gstVerifiedId) {
    const currentStatusName = statuses.find((s: any) => s.id === userData.approvalStatusId)?.name || 'Unknown';
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid user status for Bank Account verification',
        details: `Current status: ${currentStatusName}. Expected: GST_NUMBER_VERIFIED`
      }
    });
  }

  try {
    // Call the KYC service to verify bank account AND update status
    const result: KycVerificationResult = await kycService.verifyBankAccountDetails(accountNumber, ifscCode, user.id, true);

    if (!result.verified) {
      return res.status(200).json({
        success: false,
        verified: false,
        message: result.message || 'Bank account verification failed',
        data: result.data || null
      });
    }

    // Success - Bank account is verified
    // Update bank details in the appropriate user table
    try {
      const bankDetails = {
        bankAccountNo: accountNumber,
        bankAccountIfsc: ifscCode,
        bankAccountName: result.data?.fullName || '',
        isBankValidated: true,
      };

      const [retailer] = await db.select().from(retailers).where(eq(retailers.userId, user.id)).limit(1);

      if (retailer) {
        await db.update(retailers).set(bankDetails).where(eq(retailers.userId, user.id));
      } else {
        const [electrician] = await db.select().from(electricians).where(eq(electricians.userId, user.id)).limit(1);
        if (electrician) {
          await db.update(electricians).set(bankDetails).where(eq(electricians.userId, user.id));
        } else {
          const [counterSalesUser] = await db.select().from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
          if (counterSalesUser) {
            await db.update(counterSales).set(bankDetails).where(eq(counterSales.userId, user.id));
          }
        }
      }
    } catch (dbError) {
      console.error('Failed to update Bank details in user table:', dbError);
    }

    res.json(success({
      verified: true,
      bankData: result.data
    }, 'Bank account verification successful'));

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Bank account verification failed' }
    });
  }
};

/**
 * Verifies a UPI ID using Tenacio API
 * @route POST /api/kyc/verify-upi
 */
export const verifyUpi = async (req: Request<{}, {}, VerifyUpiInput>, res: Response) => {
  const user: User = (req as any).user;
  const { upiId } = req.body;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to ensure existence
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  try {
    // Call the KYC service to verify UPI
    const result: KycVerificationResult = await kycService.verifyUpiId(upiId, user.id);

    if (!result.verified) {
      return res.status(200).json({
        success: false,
        verified: false,
        message: result.message || 'UPI verification failed',
        data: result.data || null
      });
    }

    // Success - UPI is verified
    // Update UPI ID in the appropriate user table
    try {
      const [retailer] = await db.select().from(retailers).where(eq(retailers.userId, user.id)).limit(1);

      if (retailer) {
        await db.update(retailers).set({ upiId }).where(eq(retailers.userId, user.id));
      } else {
        const [electrician] = await db.select().from(electricians).where(eq(electricians.userId, user.id)).limit(1);
        if (electrician) {
          await db.update(electricians).set({ upiId }).where(eq(electricians.userId, user.id));
        } else {
          const [counterSalesUser] = await db.select().from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
          if (counterSalesUser) {
            await db.update(counterSales).set({ upiId }).where(eq(counterSales.userId, user.id));
          }
        }
      }
    } catch (dbError) {
      console.error('Failed to update UPI ID in user table:', dbError);
    }

    res.json(success({
      verified: true,
      upiData: result.data
    }, 'UPI verification successful'));

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'UPI verification failed' }
    });
  }
};

/**
 * Initiates DigiLocker verification for the authenticated user
 * @route POST /api/kyc/digilocker/initiate
 */
export const initiateDigilockerVerification = async (req: Request, res: Response) => {
  const user: User = (req as any).user;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to check approvalStatus
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  // Validate status is 'PHONE_NUMBER_VERIFIED' (mapped from phone_number_verified)
  const statuses = await db.select().from(approvalStatusesSchema).execute();
  const phoneVerifiedId = statuses.find((s: any) => s.name === APPROVAL_STATUS.PHONE_NUMBER_VERIFIED)?.id;

  if (userData.approvalStatusId !== phoneVerifiedId) {
    const currentStatusName = statuses.find((s: any) => s.id === userData.approvalStatusId)?.name || 'Unknown';
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid user status for DigiLocker verification',
        details: `Current status: ${currentStatusName}. Expected: PHONE_NUMBER_VERIFIED`
      }
    });
  }

  // Call the KYC service to initiate DigiLocker verification
  const redirectUrl: string = await kycService.initiateDigilockerVerification(user.id);

  // Return success response with redirect URL
  res.json(success({
    redirectUrl
  }, 'DigiLocker verification initiated successfully'));
};

/**
 * Fetches DigiLocker details using the latest session token
 * @route GET /api/kyc/digilocker/fetch
 */
export const fetchDigilockerDetails = async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to check approvalStatus
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  // Validate status is 'PHONE_NUMBER_VERIFIED'
  const statuses = await db.select().from(approvalStatusesSchema).execute();
  const phoneVerifiedId = statuses.find((s: any) => s.name === APPROVAL_STATUS.PHONE_NUMBER_VERIFIED)?.id;

  if (userData.approvalStatusId !== phoneVerifiedId) {
    const currentStatusName = statuses.find((s: any) => s.id === userData.approvalStatusId)?.name || 'Unknown';
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid user status for DigiLocker fetch',
        details: `Current status: ${currentStatusName}. Expected: PHONE_NUMBER_VERIFIED`
      }
    });
  }

  // Call the KYC service to fetch DigiLocker details
  // Note: kycService updates status to DIGILOCKER_COMPLETED automatically on success
  const result = await kycService.fetchDigilockerDetails(user.id);

  // Handle different statuses
  if (result.success === false) {
    // DigiLocker journey not completed or failed
    if (result.status === 'pending') {
      return res.status(200).json({
        success: false,
        status: 'pending',
        message: result.message,
        details: result.details,
        serviceStatusCode: result.serviceStatusCode,
      });
    }

    // Other failures
    return res.status(200).json({
      success: false,
      status: result.status,
      message: result.message,
    });
  }

  // Success - DigiLocker journey completed
  // Update user profile with fetched details
  if (result.data) {
    const { name, dob, gender, address } = result.data;

    try {
      // 1. Update base users table (name only, status updated by service)
      await db.update(users).set({
        name: name || undefined,
        // approvalStatusId already updated by kycService
      }).where(eq(users.id, user.id));

      // 2. Prepare Gender
      let normalizedGender = 'OTHERS';
      if (gender) {
        const lowerGender = gender.toLowerCase();
        if (lowerGender === 'm' || lowerGender === 'male') {
          normalizedGender = 'MALE';
        } else if (lowerGender === 'f' || lowerGender === 'female') {
          normalizedGender = 'FEMALE';
        }
      }

      // 3. Prepare DOB
      let dobDate: string | undefined;
      if (dob) {
        // Handle DD-MM-YYYY format from DigiLocker -> YYYY-MM-DD
        const parts = dob.split('-');
        if (parts.length === 3) {
          dobDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          dobDate = dob;
        }
      }

      // 4. Prepare Aadhaar Address
      // Concatenate address fields in the order: co+loc+house+line1+line2+vtc+locality+landmark+city+pin+state+country
      let aadhaarAddress = '';
      if (address) {
        const addressParts = [
          address.co || '',
          address.loc || '',
          address.house || '',
          address.line1 || '',
          address.line2 || '',
          address.vtc || '',
          address.locality || '',
          address.landmark || '',
          address.city || '',
          address.pin ? String(address.pin) : '',
          address.state || '',
          address.country || ''
        ].filter(part => part.trim() !== ''); // Filter out empty parts

        aadhaarAddress = addressParts.join(', ');
      }

      const updateData = {
        dob: dobDate,
        gender: normalizedGender,
        aadhaarAddress: aadhaarAddress || undefined,
      };

      // 5. Update specific role table
      const [retailer] = await db.select().from(retailers).where(eq(retailers.userId, user.id)).limit(1);

      if (retailer) {
        await db.update(retailers).set(updateData).where(eq(retailers.userId, user.id));
      } else {
        const [electrician] = await db.select().from(electricians).where(eq(electricians.userId, user.id)).limit(1);
        if (electrician) {
          await db.update(electricians).set(updateData).where(eq(electricians.userId, user.id));
        } else {
          const [counterSalesUser] = await db.select().from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
          if (counterSalesUser) {
            await db.update(counterSales).set(updateData).where(eq(counterSales.userId, user.id));
          }
        }
      }

    } catch (dbError) {
      console.error('Failed to update user profile with DigiLocker details:', dbError);
    }
  }

  res.json(success({
    aadhaarData: result.data,
    status: result.status,
  }, 'DigiLocker details fetched successfully'));
};


export const tdsConsent = async (req: Request, res: Response, next: NextFunction) => {
  // console.log("TDS consent controller called");
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
    }

    let userDetails: any;

    const [retailer] = await db.select().from(retailers).where(eq(retailers.userId, user.id)).limit(1);
    if (retailer) {
      userDetails = retailer;
    } else {
      const [electrician] = await db.select().from(electricians).where(eq(electricians.userId, user.id)).limit(1);
      if (electrician) {
        userDetails = electrician;
      } else {
        const [counterSalesUser] = await db.select().from(counterSales).where(eq(counterSales.userId, user.id)).limit(1);
        if (counterSalesUser) {
          userDetails = counterSalesUser;
        }
      }
    }
    if (!userDetails) {
      return res.status(404).json({ success: false, error: { message: 'User details not found' } });
    }

    (req as any).userDetails = userDetails;

    let tenacioData;
    if (userDetails.pan) {
      tenacioData = await kycService.getITRDetails(userDetails.pan);

      if ((!tenacioData || !tenacioData?.resData) && tenacioData?.resCode != 422) {
        throw new AppError("Service unavailable, please try again", 502);
      }
    } else {
      // Handle case where PAN is skipped or missing - default to 20% slab
      tenacioData = {
        resData: {
          panNumber: "NOT_PROVIDED",
          validPan: false,
          panAadhaarLinked: false,
          compliant: false
        },
        resCode: 200
      };
    }

    const currentUserDetails = (req as any).userDetails;

    if (currentUserDetails?.tdsConsent) {
      throw new AppError("TDS consent already given", 400);
    }

    const data = await kycService.tdsConsent(tenacioData?.resData as any, currentUserDetails);
    let responseData = {
      message: "unknown",
      code: 500,
      data: {
        panNumber: data?.panNumber,
        tdsSlab: data?.tdsSlabs
      }
    }
    if (data?.aadhaarLinked && data?.panValid && data?.itr) {
      responseData.code = 200;
      responseData.message = "Your TDS deduction will be @10% as your PAN details are Valid";
    } else if (!data?.panValid) {
      responseData.code = 201;
      responseData.message = data?.panNumber === "NOT_PROVIDED"
        ? "Your TDS deduction will be @20% as PAN was not provided."
        : "Your TDS deduction will be @20% as your PAN details are invalid.";
    } else if (!data?.aadhaarLinked) {
      responseData.code = 202;
      responseData.message = "Your TDS deduction will be @20% as your PAN and Aadhaar are not linked.";
    } else if (!data?.itr) {
      responseData.code = 203;
      responseData.message = "Your TDS deduction will be @20% because of non-filling tax return.";
    } else {
      responseData.code = 500;
      responseData.message = "unknown";
    }

    return res.json(responseData)
  } catch (error) {
    next(error);
  }
}