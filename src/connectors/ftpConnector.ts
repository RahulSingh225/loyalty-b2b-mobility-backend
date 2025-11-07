import { BaseConnector } from './baseConnector';

export class FtpConnector extends BaseConnector {
  async upload(path: string, data: Buffer | string) {
    return `ftp://${path}`;
  }
  async download(path: string) {
    return Buffer.from('');
  }
  async delete(path: string) {}
}
