import { CommBaseConnector } from '../baseConnector';

export class TwilioSmsConnector extends CommBaseConnector {
  async send(payload: any) {
    // TODO: implement using twilio client
    return { ok: true, provider: 'twilio-sms', payload };
  }
}
