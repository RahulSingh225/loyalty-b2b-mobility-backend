import { Request, Response } from 'express';
import { kycDocumentService } from '../services/kycDocumentService';
import { success } from '../utils/response';

export const submitKycDocument = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { documentType, documentValue } = req.body;

  if (!documentType || !documentValue) {
    return res.status(400).json({ success: false, error: { message: 'Document type and value required' } });
  }

  const canResubmit = await kycDocumentService.canUserResubmit(user.id, documentType);
  if (!canResubmit) {
    return res.status(400).json({ success: false, error: { message: 'Document already submitted and pending verification' } });
  }

  const document = await kycDocumentService.submitDocument(user.id, documentType, documentValue);
  res.json(success(document, 'Document submitted for verification'));
};

export const getKycStatus = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const documents = await kycDocumentService.getAllDocumentsStatus(user.id);
  
  const status = {
    documents: documents,
    overallStatus: documents.length > 0 ? (documents.every((d: any) => d.verificationStatus === 'verified') ? 'verified' : 'pending') : 'not_started',
  };

  res.json(success(status));
};

export const getKycDocument = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { documentType } = req.params;

  const document = await kycDocumentService.getDocumentStatus(user.id, documentType);
  if (!document) return res.status(404).json({ success: false, error: { message: 'Document not found' } });

  res.json(success(document));
};

export const resubmitKycDocument = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { documentType } = req.params;
  const { documentValue } = req.body;

  if (!documentValue) {
    return res.status(400).json({ success: false, error: { message: 'Document value required' } });
  }

  const canResubmit = await kycDocumentService.canUserResubmit(user.id, documentType);
  if (!canResubmit) {
    return res.status(400).json({ success: false, error: { message: 'Cannot resubmit this document at this time' } });
  }

  const document = await kycDocumentService.submitDocument(user.id, documentType, documentValue);
  res.json(success(document, 'Document resubmitted for verification'));
};

export const getKycHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20 } = req.query;

  const opts = { page: parseInt(String(page)), pageSize: parseInt(String(pageSize)) };
  const result = await kycDocumentService.getKycHistory(user.id, opts);

  res.json(success(result));
};
