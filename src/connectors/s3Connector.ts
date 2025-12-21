import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BaseConnector } from './baseConnector';

export class S3Connector extends BaseConnector {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    super();
    this.bucketName = process.env.AWS_S3_BUCKET || '';
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async upload(path: string, data: Buffer | string): Promise<string> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: path,
      Body: buffer,
      ContentType: this.getContentType(path),
    });

    await this.client.send(command);
    return `s3://${this.bucketName}/${path}`;
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: path,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async download(path: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: path,
    });

    const response = await this.client.send(command);
    return Buffer.from(await response.Body!.transformToByteArray());
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: path,
    });

    await this.client.send(command);
  }

  private getContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      json: 'application/json',
    };
    return types[ext || ''] || 'application/octet-stream';
  }
}
