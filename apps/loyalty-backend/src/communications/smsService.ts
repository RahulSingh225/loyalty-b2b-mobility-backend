import { CommBaseConnector } from './baseConnector';

export class SmsService {
  constructor(private connector: CommBaseConnector) {}

  async sendSms(to: string, message: string) {
    return this.connector.send({ to, message });
  }
}
