import { CommBaseConnector } from './baseConnector';

export class EmailService {
  constructor(private connector: CommBaseConnector) {}

  async sendEmail(to: string, subject: string, html: string) {
    return this.connector.send({ to, subject, html });
  }
}
