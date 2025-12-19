import { CommBaseConnector } from '../baseConnector';

export class SendGridConnector extends CommBaseConnector {
  async send(payload: any) {
    // TODO: implement using @sendgrid/mail
    return { ok: true, provider: 'sendgrid', payload };
  }
}
