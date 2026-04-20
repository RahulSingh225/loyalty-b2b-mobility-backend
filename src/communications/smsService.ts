import { CommBaseConnector } from './baseConnector';

export class SmsService {
  constructor(private connector: CommBaseConnector) { }

  async sendSms(to: string, message: string, metadata?: any) {
    return this.connector.send({ to, message, ...metadata });
  }
}
