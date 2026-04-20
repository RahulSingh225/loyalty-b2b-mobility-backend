import { EmailService } from './emailService';
import { SmsService } from './smsService';
import { NotificationService } from './notificationService';
import { AirtelSmsConnector } from './vendors/airtelSmsConnector';
import { FcmConnector } from './vendors/fcmConnector';
// import { NodemailerConnector } from './vendors/nodemailerConnector';

export const smsService = new SmsService(new AirtelSmsConnector());
// export const emailService = new EmailService(new NodemailerConnector());
export const notificationService = new NotificationService(
    new FcmConnector(),
    smsService,
    // emailService
);
