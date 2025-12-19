import { CommBaseConnector } from '../baseConnector';
import nodemailer from 'nodemailer';

export class NodemailerConnector extends CommBaseConnector {
  private transporter: nodemailer.Transporter;

  constructor() {
    super();
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }

  async send(payload: any) {
    const { to, subject, html, text, from } = payload;
    const info = await this.transporter.sendMail({ from: from || process.env.SMTP_FROM, to, subject, html, text });
    return { ok: true, provider: 'nodemailer', info };
  }
}
