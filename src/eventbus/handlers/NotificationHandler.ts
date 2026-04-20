/**
 * NotificationHandler
 *
 * Sends push/SMS/email notifications based on event_master.templateId.
 * Extracted from NotificationSubscriber — same logic, now as a pluggable handler.
 */
import { IEventHandler, EventPayload } from '../IEventHandler';
import { db } from '../../config/db';
import { eq } from 'drizzle-orm';
import { eventMaster, notificationTemplates } from '../../schema';
import { notificationService } from '../../communications';

export class NotificationHandler implements IEventHandler {
  readonly name = 'NotificationHandler';

  shouldHandle(payload: EventPayload): boolean {
    // Must have a userId OR a phone number in metadata to send notifications
    return !!payload.userId || !!payload.metadata?.phone;
  }

  async handle(payload: EventPayload, _config: Record<string, any>): Promise<void> {
    // Fetch event + template in one query
    const [eventWithTemplate] = await db
      .select({
        eventKey: eventMaster.eventKey,
        eventName: eventMaster.name,
        template: notificationTemplates,
      })
      .from(eventMaster)
      .innerJoin(notificationTemplates, eq(eventMaster.templateId, notificationTemplates.id))
      .where(eq(eventMaster.eventKey, payload.eventKey))
      .limit(1);

    if (!eventWithTemplate) {
      // No template linked to this event — nothing to send
      console.log(`[NotificationHandler] No template for ${payload.eventKey}. Skipping.`);
      return;
    }

    const { template } = eventWithTemplate;
    const metadata = payload.metadata || {};

    // Determine channels based on template content
    const channels: ('push' | 'sms' | 'email')[] = [];
    if (template.pushBody) channels.push('push');
    if (template.smsBody) channels.push('sms');

    if (channels.length === 0) {
      console.log(`[NotificationHandler] Template for ${payload.eventKey} has no push/sms body. Skipping.`);
      return;
    }

    await notificationService.notify(payload.userId ? payload.userId.toString() : null, {
      to: metadata.phone,
      data: metadata,
      channels,
      template: {
        pushTitle: template.pushTitle,
        pushBody: template.pushBody,
        smsBody: template.smsBody,
        smsDltTemplateId: template.smsDltTemplateId,
        smsEntityId: template.smsEntityId,
        smsMessageType: template.smsMessageType,
        smsSourceAddress: template.smsSourceAddress,
        smsCustomerId: template.smsCustomerId,
        placeholders: metadata,
      },
    });

    console.log(`[NotificationHandler] Sent ${channels.join(',')} for ${payload.eventKey} to user ${payload.userId}`);
  }
}
