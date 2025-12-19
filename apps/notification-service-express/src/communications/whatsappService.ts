import { CommBaseConnector } from './baseConnector';

export class WhatsappService {
  constructor(private connector: CommBaseConnector) {}

  async sendMessage(to: string, message: string) {
    return this.connector.send({ to, message });
  }
}
