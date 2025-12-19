import { EmailService } from './emailService';
import { SmsService } from './smsService';
import { WhatsappService } from './whatsappService';
import { NotificationService } from './notificationService';
import { NodemailerConnector } from './vendors/nodemailerConnector';
import { TwilioSmsConnector } from './vendors/twilioSmsConnector';
import { FcmConnector } from './vendors/fcmConnector';
import { TwilioWhatsappConnector } from './vendors/twilioWhatsappConnector';

export const emailService = new EmailService(new NodemailerConnector());
export const smsService = new SmsService(new TwilioSmsConnector());
export const whatsappService = new WhatsappService(new TwilioWhatsappConnector());
export const notificationService = new NotificationService(new FcmConnector());
