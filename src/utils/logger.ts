import { db } from '../config/db';
import { systemLogs } from '../schema';

export const logSystemError = async (message: string, correlationId: string, userId?: number, ip?: string, userAgent?: string) => {
  await db.insert(systemLogs).values({
    logLevel: 'ERROR',
    componentName: 'system',
    message,
    action: 'error',
    correlationId,
    userId,
    ipAddress: ip,
    userAgent,
    createdAt: new Date(),
  });
};
