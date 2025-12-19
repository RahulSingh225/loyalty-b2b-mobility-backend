import { db, systemLogs } from '@loyalty/shared-db';

export const logSystemError = async (message: string, correlationId: string, userId?: number, ip?: string, userAgent?: string) => {
  await db.insert(systemLogs).values({
    logLevel: 'ERROR',
    componentName: 'system',
    message,
    action: 'error',
    correlationId,
    userId,
    ipAddress: ip,
    userAgent
  });
};
