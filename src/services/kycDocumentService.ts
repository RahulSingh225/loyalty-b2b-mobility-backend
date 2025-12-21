import { BaseService } from './baseService';
import { kycDocuments } from '../schema';
import { desc, eq } from 'drizzle-orm';
import { PaginationOptions } from './baseService';
import { KycService } from './kyc.service';

class KycDocumentService extends BaseService<typeof kycDocuments> {
  private kycService = new KycService();

  async submitDocument(userId: number, documentType: string, documentValue: string) {
    // Verify document with external service
    const verificationResult = await this.kycService.verifyDocument(documentType as any, documentValue);

    // Check if document already exists for user
    const [existing] = await this.findOne({ userId, documentType });

    if (existing) {
      // Update existing document
      const [updated] = await this.update(
        { userId, documentType },
        {
          documentValue,
          verificationStatus: verificationResult.verified ? 'verified' : 'rejected',
          verificationResult: JSON.stringify(verificationResult),
          verifiedAt: verificationResult.verified ? new Date().toISOString() : undefined,
          rejectionReason: !verificationResult.verified ? verificationResult.message : undefined,
          updatedAt: new Date().toISOString(),
        }
      );
      return updated;
    }

    // Create new document
    const [created] = await this.create({
      userId,
      documentType,
      documentValue,
      verificationStatus: verificationResult.verified ? 'verified' : 'rejected',
      verificationResult: JSON.stringify(verificationResult),
      verifiedAt: verificationResult.verified ? new Date().toISOString() : undefined,
      rejectionReason: !verificationResult.verified ? verificationResult.message : undefined,
    });
    return created;
  }

  async getDocumentStatus(userId: number, documentType: string) {
    const [document] = await this.findOne({ userId, documentType });
    return document || null;
  }

  async getAllDocumentsStatus(userId: number) {
    const documents = await this.findMany({ userId });
    return documents;
  }

  async getKycHistory(userId: number, opts: PaginationOptions = {}) {
    const { page = 1, pageSize = 20 } = opts;
    const result = await this.findManyPaginated(
      { userId },
      { page, pageSize, orderBy: desc(kycDocuments.createdAt) }
    );
    return result;
  }

  async canUserResubmit(userId: number, documentType: string) {
    const [document] = await this.findOne({ userId, documentType });
    if (!document) return true; // Can submit if doesn't exist
    if (document.verificationStatus === 'rejected') return true; // Can resubmit after rejection
    if (document.verificationStatus === 'expired') return true; // Can resubmit after expiry
    return false; // Cannot resubmit verified/pending
  }
}

export const kycDocumentService = new KycDocumentService(kycDocuments as any);
