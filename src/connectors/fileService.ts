import { BaseConnector } from './baseConnector';

export class FileService {
  constructor(private connector: BaseConnector) {}

  async uploadFile(path: string, data: Buffer | string) {
    return this.connector.upload(path, data);
  }

  async getFile(path: string) {
    return this.connector.download(path);
  }

  async deleteFile(path: string) {
    return this.connector.delete(path);
  }
}
