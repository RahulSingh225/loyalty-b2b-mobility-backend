import { db } from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';
import { emit } from '../mq/mqService';

/**
 * Base Procedure
 *
 * Procedures are atomic operations that do core DB work inside transactions.
 * After completing their work, they call emit() to fire events on the bus.
 * All side effects (notifications, bonuses, audit logging) are handled by
 * EventBus handlers — procedures do NOT call those directly.
 */
export abstract class Procedure<TInput = any, TOutput = any> {
  correlationId: string;
  protected userId?: number;
  protected ip?: string;
  protected userAgent?: string;
  protected metadata?: Record<string, any>;

  constructor(protected input: TInput) {
    this.correlationId = uuidv4();
  }

  /**
   * Emit an event to the event bus.
   * This replaces the old logEvent() method. It does NOT do inline DB logging
   * or notification sending — those are handled by AuditLogHandler and
   * NotificationHandler via the event bus.
   */
  protected async emitEvent(
    eventKey: string,
    entityId?: string | number,
    extraMetadata?: Record<string, any>
  ): Promise<void> {
    await emit(eventKey, {
      userId: this.userId,
      entityId,
      correlationId: this.correlationId,
      ipAddress: this.ip,
      userAgent: this.userAgent,
      metadata: { ...this.metadata, ...extraMetadata },
    });
  }

  protected async withTransaction<R>(fn: (tx: any) => Promise<R>): Promise<R> {
    return db.transaction(async (tx) => {
      try {
        return await fn(tx);
      } catch (err) {
        // Emit error event (non-blocking, fire-and-forget)
        this.emitEvent('API_ERROR', undefined, { error: (err as Error).message }).catch(() => {});
        throw err;
      }
    });
  }

  abstract execute(): Promise<TOutput>;

  setContext(userId: number, ip: string, userAgent: string, metadata?: Record<string, any>): this {
    this.userId = userId;
    this.ip = ip;
    this.userAgent = userAgent;
    this.metadata = metadata;
    return this;
  }
}
