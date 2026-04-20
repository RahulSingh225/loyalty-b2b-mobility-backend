/**
 * AuditLogHandler
 *
 * Writes every event to event_logs and system_logs tables.
 * Extracted from Procedure.logEvent() — this is the "always-on" handler.
 */
import { IEventHandler, EventPayload } from '../IEventHandler';
import { db } from '../../config/db';
import { eq } from 'drizzle-orm';
import { eventMaster, eventLogs, systemLogs } from '../../schema';

export class AuditLogHandler implements IEventHandler {
  readonly name = 'AuditLogHandler';

  shouldHandle(_payload: EventPayload): boolean {
    return true; // Always log
  }

  async handle(payload: EventPayload, _config: Record<string, any>): Promise<void> {
    // Look up the event in event_master
    const [event] = await db
      .select()
      .from(eventMaster)
      .where(eq(eventMaster.eventKey, payload.eventKey))
      .limit(1);

    if (!event || !event.isActive) {
      console.log(`[AuditLogHandler] Event "${payload.eventKey}" not found or inactive. Skipping audit log.`);
      return;
    }

    // Write to event_logs
    await db.insert(eventLogs).values({
      userId: payload.userId,
      action: event.name,
      eventId: event.id,
      // event.category can be null for some seeded events; provide a safe default
      eventType: event.category || 'GENERAL',
      entityId: payload.entityId?.toString(),
      correlationId: payload.correlationId,
      metadata: payload.metadata || {},
      ipAddress: payload.metadata?.ipAddress,
      userAgent: payload.metadata?.userAgent,
    } as any);

    // Write to system_logs
    await db.insert(systemLogs).values({
      logLevel: 'INFO',
      componentName: 'EventBus',
      message: `${event.name} triggered`,
      action: event.name,
      correlationId: payload.correlationId,
      userId: payload.userId,
      ipAddress: payload.metadata?.ipAddress,
      userAgent: payload.metadata?.userAgent,
    });

    console.log(`[AuditLogHandler] Logged: ${payload.eventKey} (correlationId: ${payload.correlationId})`);
  }
}
