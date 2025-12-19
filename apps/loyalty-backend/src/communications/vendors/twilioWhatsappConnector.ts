import { CommBaseConnector } from '../baseConnector';

export class TwilioWhatsappConnector extends CommBaseConnector {
  async send(payload: any) {
    // TODO: implement using Twilio API for WhatsApp
    return { ok: true, provider: 'twilio-whatsapp', payload };
  }
}
