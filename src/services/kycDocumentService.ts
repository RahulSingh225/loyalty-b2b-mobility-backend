import { BaseService } from './baseService';
import { kycDocuments } from '../schema';
import { desc, eq } from 'drizzle-orm';
import { emit } from '../mq/mqService';
import db from '../config/db';
import { PaginationOptions } from './baseService';
import { KycService } from './kyc.service';
import { FileService } from '../connectors/fileService';
import { S3Connector } from '../connectors/s3Connector';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

class KycDocumentService extends BaseService<typeof kycDocuments> {
  private kycService = new KycService();
  private fileService: FileService;
  private s3Connector: S3Connector;

  constructor(table: typeof kycDocuments) {
    super(table);
    this.s3Connector = new S3Connector();
    this.fileService = new FileService(this.s3Connector);
  }

  private async logEvent(userId: number, eventCode: string, entityId?: string | number, extraMetadata?: any) {
    try {
      await emit(eventCode, {
        userId,
        entityId,
        metadata: extraMetadata || {},
      });
    } catch (error) {
      console.error(`[KycDocumentService] Failed to emit event ${eventCode}:`, error);
      // Don't throw - logging failures shouldn't block document submission
    }
  }

  /**
   * Upload file to S3 and return the S3 path
   */
  async uploadDocumentFile(
    fileBuffer: Buffer,
    userId: number,
    documentType: string,
    originalFileName: string
  ): Promise<string> {
    const fileExtension = path.extname(originalFileName);
    const fileName = `${uuidv4()}${fileExtension}`;
    const s3Path = `kyc-documents/${userId}/${documentType}/${fileName}`;

    // Upload to S3 using existing file service
    const uploadedPath = await this.fileService.uploadFile(s3Path, fileBuffer);
    return uploadedPath;
  }

  /**
   * Get signed URL for accessing a file from S3
   */
  async getFileSignedUrl(s3Path: string, expiresIn: number = 3600): Promise<string> {
    // Extract the path from s3://bucket/path format
    const pathMatch = s3Path.match(/^s3:\/\/[^/]+\/(.+)$/);
    if (!pathMatch) {
      throw new Error('Invalid S3 path format');
    }

    const filePath = pathMatch[1];
    return this.s3Connector.getSignedUrl(filePath, expiresIn);
  }

  /**
   * Submit document with optional file upload
   */
  async submitDocument(
    userId: number,
    documentType: string,
    documentValue: string,
    fileBuffer?: Buffer,
    originalFileName?: string,
    context?: any
  ) {
    // Redundant attempt log removed to reduce duplicates
    // await this.logEvent(userId, 'USER_KYC_SUBMITTED', userId, { documentType, ...context });
    let fileUrl: string | undefined;

    // Upload file to S3 if provided
    if (fileBuffer && originalFileName) {
      fileUrl = await this.uploadDocumentFile(fileBuffer, userId, documentType, originalFileName);
    }

    // Verify document with external service
    const verificationResult = await this.kycService.verifyDocument(documentType as any, documentValue);

    // Check if document already exists for user
    const [existing] = await this.findOne({ userId, documentType });

    const documentData: any = {
      documentValue,
      verificationStatus: verificationResult.verified ? 'verified' : 'rejected',
      verificationResult: JSON.stringify(verificationResult),
      verifiedAt: verificationResult.verified ? new Date().toISOString() : undefined,
      rejectionReason: !verificationResult.verified ? verificationResult.message : undefined,
      updatedAt: new Date().toISOString(),
    };

    // Add file metadata if file was uploaded
    if (fileUrl) {
      documentData.metadata = {
        fileUrl,
        uploadedAt: new Date().toISOString(),
        originalFileName
      };
    }

    if (existing) {
      // Update existing document
      const [updated] = await this.update({ userId, documentType }, documentData);

      // 📋 Log Success
      await this.logEvent(userId, 'USER_KYC_SUBMITTED', userId, {
        status: 'SUCCESS',
        documentType,
        verificationStatus: documentData.verificationStatus
      });

      return updated;
    }

    // Create new document
    const [created] = await this.create({
      userId,
      documentType,
      ...documentData,
    });

    // 📋 Log Success
    await this.logEvent(userId, 'USER_KYC_SUBMITTED', userId, {
      status: 'SUCCESS',
      documentType,
      verificationStatus: documentData.verificationStatus
    });

    return created;
  }

  /**
   * Submit document with only file (no document value)
   */
  async submitDocumentFileOnly(
    userId: number,
    documentType: string,
    fileBuffer: Buffer,
    originalFileName: string,
    context?: any
  ) {
    // Redundant attempt log removed to reduce duplicates
    // await this.logEvent(userId, 'USER_KYC_SUBMITTED', userId, { documentType, ...context });

    const fileUrl = await this.uploadDocumentFile(fileBuffer, userId, documentType, originalFileName);

    const [existing] = await this.findOne({ userId, documentType });

    const documentData: any = {
      documentValue: fileUrl, // Use file URL as document value
      verificationStatus: 'pending',
      metadata: {
        fileUrl,
        uploadedAt: new Date().toISOString(),
        originalFileName
      },
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      const [updated] = await this.update({ userId, documentType }, documentData);

      // 📋 Log Success
      await this.logEvent(userId, 'USER_KYC_SUBMITTED', userId, {
        status: 'SUCCESS',
        documentType,
        verificationStatus: 'pending'
      });

      return updated;
    }

    const [created] = await this.create({
      userId,
      documentType,
      ...documentData,
    });

    // 📋 Log Success
    await this.logEvent(userId, 'USER_KYC_SUBMITTED', userId, {
      status: 'SUCCESS',
      documentType,
      verificationStatus: 'pending'
    });

    return created;
  }

  async getDocumentStatus(userId: number, documentType: string) {
    const [document] = await this.findOne({ userId, documentType });
    return document || null;
  }

  /**
   * Get document with signed URL for file access
   */
  async getDocumentWithSignedUrl(userId: number, documentType: string, expiresIn: number = 3600) {
    const document = await this.getDocumentStatus(userId, documentType);
    if (!document) return null;

    // If document has a file URL, generate signed URL
    if (document.metadata && typeof document.metadata === 'object' && 'fileUrl' in document.metadata) {
      const fileUrl = (document.metadata as any).fileUrl;
      const signedUrl = await this.getFileSignedUrl(fileUrl, expiresIn);

      return {
        ...document,
        fileAccessUrl: signedUrl,
      };
    }

    return document;
  }

  async getAllDocumentsStatus(userId: number) {
    const documents = await this.findManyPaginated({ userId });
    return documents;
  }

  /**
   * Get all documents with signed URLs for file access
   */
  async getAllDocumentsWithSignedUrls(userId: number, expiresIn: number = 3600) {
    const documents = await this.getAllDocumentsStatus(userId);

    // Add signed URLs to documents that have files
    const documentsWithUrls = await Promise.all(
      documents.rows.map(async (doc: any) => {
        if (doc.metadata && typeof doc.metadata === 'object' && 'fileUrl' in doc.metadata) {
          const fileUrl = doc.metadata.fileUrl;
          const signedUrl = await this.getFileSignedUrl(fileUrl, expiresIn);
          return {
            ...doc,
            fileAccessUrl: signedUrl,
          };
        }
        return doc;
      })
    );

    return {
      ...documents,
      rows: documentsWithUrls,
    };
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
