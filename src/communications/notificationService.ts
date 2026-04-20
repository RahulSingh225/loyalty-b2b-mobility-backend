import { db } from '../config/db';
import { users, notificationLogs } from '../schema';
import { eq } from 'drizzle-orm';
import { EmailService } from './emailService';
import { SmsService } from './smsService';
import { FcmConnector } from './vendors/fcmConnector';

export class NotificationService {
  constructor(
    private fcm: FcmConnector,
    private sms?: SmsService,
    private email?: EmailService
  ) { }

  async notify(userId: string | null, payload: {
    to?: string;
    title?: string;
    body?: string;
    data?: any;
    channels?: ('push' | 'sms' | 'email')[];
    template?: {
      pushTitle?: string | null;
      pushBody?: string | null;
      smsBody?: string | null;
      smsDltTemplateId?: string | null;
      smsEntityId?: string | null;
      smsMessageType?: string | null;
      smsSourceAddress?: string | null;
      smsCustomerId?: string | null;
      placeholders?: Record<string, any>;
    }
  }) {
    const channels = payload.channels || ['push'];
    const results: any[] = [];

    // Resolve content from template if provided
    let title = payload.title;
    let pushBody = payload.body;
    let smsBody = payload.body;

    if (payload.template) {
      const placeholders = payload.template.placeholders || {};
      if (payload.template.pushTitle) title = this.processTemplate(payload.template.pushTitle, placeholders);
      if (payload.template.pushBody) pushBody = this.processTemplate(payload.template.pushBody, placeholders);
      if (payload.template.smsBody) smsBody = this.processTemplate(payload.template.smsBody, placeholders);
    }

    if (channels.includes('push') && pushBody) {
      // Fetch user's FCM token from DB
      const [user] = await db
        .select({ fcmToken: users.fcmToken })
        .from(users)
        .where(eq(users.id, Number(userId)))
        .limit(1);

      if (userId && user?.fcmToken) {
        try {
          const res = await this.fcm.send({
            token: user.fcmToken,
            notification: { title: title || 'Notification', body: pushBody },
            data: payload.data
          });
          results.push(res);
          await this.logNotification(userId, 'push', 'sent', { title, body: pushBody, data: payload.data });
        } catch (error: any) {
          console.error(`[NotificationService] Push failed`, error);
          await this.logNotification(userId, 'push', 'failed', { title, body: pushBody, error: error.message });
        }
      } else if (pushBody) {
        console.warn(`[NotificationService] Skipping push: No userId or FCM token found for user ${userId}`);
        if (userId) await this.logNotification(userId, 'push', 'failed', { title, body: pushBody, error: 'No FCM token' });
      }
    }

    if (channels.includes('sms') && smsBody && this.sms) {
      let targetPhone = payload.to;

      // If no phone provided in payload, try to fetch from DB using userId
      if (!targetPhone && userId) {
        const [user] = await db
          .select({ phone: users.phone })
          .from(users)
          .where(eq(users.id, Number(userId)))
          .limit(1);
        targetPhone = user?.phone;
      }

      if (targetPhone) {
        try {
          const smsMetadata = {
            smsDltTemplateId: payload.template?.smsDltTemplateId,
            smsEntityId: payload.template?.smsEntityId,
            smsMessageType: payload.template?.smsMessageType,
            smsSourceAddress: payload.template?.smsSourceAddress,
            smsCustomerId: payload.template?.smsCustomerId
          };

          const res = await this.sms.sendSms(targetPhone, smsBody, smsMetadata);
          results.push(res);
          await this.logNotification(userId, 'sms', 'sent', { phone: targetPhone, body: smsBody, ...smsMetadata });
        } catch (error: any) {
          console.error(`[NotificationService] SMS failed`, error);
          await this.logNotification(userId, 'sms', 'failed', { phone: targetPhone, body: smsBody, error: error.message });
        }
      } else {
        console.warn(`[NotificationService] No phone found for SMS delivery (userId: ${userId})`);
        if (userId) await this.logNotification(userId, 'sms', 'failed', { body: smsBody, error: 'No phone number' });
      }
    }

    if (channels.includes('email') && this.email) {
      try {
        const res = await this.email.sendEmail('user-email', title || 'Notification', pushBody || '');
        results.push(res);
        await this.logNotification(userId, 'email', 'sent', { title, body: pushBody });
      } catch (error) {
        console.error(`[NotificationService] Email failed`, error);
        await this.logNotification(userId, 'email', 'failed', { title, body: pushBody, error: error.message });
      }
    }

    return results;
  }

  private processTemplate(content: string, placeholders: Record<string, any>): string {
    return content.replace(/{{?(\w+)}}?/g, (match, key) => {
      return placeholders[key] !== undefined ? String(placeholders[key]) : match;
    });
  }

  private async logNotification(
    userId: string | null,
    channel: 'push' | 'sms' | 'email',
    status: 'sent' | 'failed',
    metadata: any
  ) {
    try {
      await db.insert(notificationLogs).values({
        userId: userId ? Number(userId) : null,
        channel: channel as any,
        triggerType: 'automated',
        status: status as any,
        metadata,
        sentAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[NotificationService] Failed to log notification:', err);
    }
  }

  // Example handler for a specific event
  async handleKycApproved(userId: string) {
    return this.notify(userId, {
      title: 'KYC Approved!',
      body: 'Your KYC has been successfully verified. You can now start earning points.',
      channels: ['push', 'sms'] // Logic: send both push and sms for KYC
    });
  }
}
