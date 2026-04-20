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
    userAgent
  });
};

export const logger = {
  error: (data: any) => {
    console.error(`ERROR: ${JSON.stringify(data, null, 2)}`);
  },
  warn: (data: any) => {
    console.warn(`WARN: ${JSON.stringify(data, null, 2)}`);
  },
  info: (data: any) => {
    console.log(`INFO: ${JSON.stringify(data, null, 2)}`);
  }
};
