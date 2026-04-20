import { db } from '../config/db';
import { eq, isNotNull } from 'drizzle-orm';
import { eventMaster, notificationTemplates } from '../schema';
import { subscribe, BUS_EVENTS } from '../mq/mqService';
import { NotificationService } from './notificationService';

export class NotificationSubscriber {
    constructor(private notificationService: NotificationService) { }

    /**
     * Initialize all communication-related event listeners by fetching
     * events that have associated templates from the database.
     */
    public async init() {
        console.log('Initializing NotificationSubscriber...');

        const maxRetries = 5;
        const retryDelay = 5000; // 5 seconds

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Fetch all events that have an associated notification template
                const eventsWithTemplates = await db
                    .select({
                        eventKey: eventMaster.eventKey,
                        eventName: eventMaster.name,
                        template: notificationTemplates,
                    })
                    .from(eventMaster)
                    .innerJoin(notificationTemplates, eq(eventMaster.templateId, notificationTemplates.id))
                    .where(eq(eventMaster.isActive, true));

                console.log(`[NotificationSubscriber] Found ${eventsWithTemplates.length} events with templates.`);

                for (const event of eventsWithTemplates) {
                    const routingKey = BUS_EVENTS[event.eventKey as keyof typeof BUS_EVENTS];
                    if (!routingKey) {
                        console.warn(`[NotificationSubscriber] No BUS_EVENT mapping found for: ${event.eventKey}`);
                        continue;
                    }

                    console.log(`[NotificationSubscriber] Subscribing to: ${routingKey}`);

                    subscribe(routingKey, async (payload) => {
                        console.log(`[NotificationSubscriber] Triggered: ${event.eventKey}`, payload);

                        const { userId, metadata } = payload;
                        if (!userId) {
                            console.warn(`[NotificationSubscriber] No userId found in payload for event ${event.eventKey}`);
                            return;
                        }

                        // Determine channels based on template content
                        const channels: ('push' | 'sms' | 'email')[] = [];
                        if (event.template.pushBody) channels.push('push');
                        if (event.template.smsBody) channels.push('sms');

                        await this.notificationService.notify(userId.toString(), {
                            data: metadata,
                            channels,
                            template: {
                                pushTitle: event.template.pushTitle,
                                pushBody: event.template.pushBody,
                                smsBody: event.template.smsBody,
                                smsDltTemplateId: event.template.smsDltTemplateId,
                                smsEntityId: event.template.smsEntityId,
                                smsMessageType: event.template.smsMessageType,
                                smsSourceAddress: event.template.smsSourceAddress,
                                smsCustomerId: event.template.smsCustomerId,
                                placeholders: metadata,
                            }
                        }).catch(err => console.error(`[NotificationSubscriber] Notify failed for ${event.eventKey}:`, err));
                    });
                }

                console.log('NotificationSubscriber dynamic initialization complete.');
                return; // Success, exit the loop
            } catch (error) {
                console.error(`[NotificationSubscriber] Initialization attempt ${attempt} failed:`, error);
                if (attempt < maxRetries) {
                    console.log(`[NotificationSubscriber] Retrying in ${retryDelay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    console.error('[NotificationSubscriber] All initialization attempts failed.');
                }
            }
        }
    }
}
