export abstract class BaseConnector {
  abstract upload(path: string, data: Buffer | string): Promise<string>;
  abstract download(path: string): Promise<Buffer>;
  abstract delete(path: string): Promise<void>;
}
