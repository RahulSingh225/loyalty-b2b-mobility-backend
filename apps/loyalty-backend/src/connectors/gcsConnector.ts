import { BaseConnector } from './baseConnector';

export class GcsConnector extends BaseConnector {
  async upload(path: string, data: Buffer | string) {
    return `gcs://${path}`;
  }
  async download(path: string) {
    return Buffer.from('');
  }
  async delete(path: string) {}
}
