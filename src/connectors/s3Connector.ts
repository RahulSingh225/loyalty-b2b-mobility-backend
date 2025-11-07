import { BaseConnector } from './baseConnector';

export class S3Connector extends BaseConnector {
  async upload(path: string, data: Buffer | string) {
    // stub: implement AWS SDK upload
    return `s3://${path}`;
  }
  async download(path: string) {
    return Buffer.from('');
  }
  async delete(path: string) {}
}
