import { db } from '../config/db';
import { eq, and } from 'drizzle-orm';
import { eventMaster, systemLogs, eventLogs } from '../schema';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';

export abstract class Procedure<TInput = any, TOutput = any> {
   correlationId: string;
  protected userId?: number;
  protected ip?: string;
  protected userAgent?: string;
  protected metadata?: Record<string, any>;

  constructor(protected input: TInput) {
    this.correlationId = uuidv4();
  }

  protected async logEvent(eventCode: string, entityId?: string | number, extraMetadata?: any): Promise<void> {
    const [event] = await db.select().from(eventMaster).where(eq(eventLogs.correlationId, eventCode));
    if (!event || !event.isActive) return;

    const logData = {
      userId: this.userId,
      action: event.name,
      eventType: event.name,
      entityId: entityId?.toString(),
      correlationId: this.correlationId,
      metadata: { ...this.metadata, ...extraMetadata },
      ipAddress: this.ip,
      userAgent: this.userAgent,
    
    };

    await db.insert(eventLogs).values(logData as any);

    await db.insert(systemLogs).values({
      logLevel: 'INFO',
      componentName: this.constructor.name,
      message: `${event.name} triggered`,
      action: event.name,
      correlationId: this.correlationId,
      userId: this.userId,
      ipAddress: this.ip,
      userAgent: this.userAgent,
      
    });
  }

protected async withTransaction<R>(fn: (tx: any) => Promise<R>): Promise<R> {
    return db.transaction(async (tx) => {
      try {
        return await fn(tx);
      } catch (err) {
        await this.logEvent('API_ERROR', undefined, { error: (err as Error).message });
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
