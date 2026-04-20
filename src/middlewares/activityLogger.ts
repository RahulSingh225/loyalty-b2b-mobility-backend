import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { systemLogs, users } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware to log API activity to system_logs.
 * @param action The action name to log (e.g., 'REGISTER_USER', 'LOGIN')
 * @param component The component name (default: 'API')
 */
export const logActivity = (action: string, component: string = 'API') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        // Capture authenticated user ID if available (set by auth middleware)
        const userId = (req as any).user?.id || null;

        // Hook into the 'finish' event to log after response is sent
        res.on('finish', async () => {
            try {
                const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
                const logLevel = isSuccess ? 'INFO' : 'ERROR';

                // If the controller set a newly created user ID in locals, use it.
                // useful for registration where userId is created during the request.
                const effectiveUserId = res.locals.newUserId || userId;

                // Defensive: Verify that if a userId is provided, it actually exists in the database
                if (effectiveUserId) {
                    const [userExists] = await db
                        .select()
                        .from(users)
                        .where(eq(users.id, effectiveUserId))
                        .limit(1);

                    // Only proceed with logging if the user exists
                    if (!userExists) {
                        console.warn(`Activity logging skipped: User ${effectiveUserId} not found in database. Transaction may not have been committed yet.`);
                        return;
                    }
                }

                // Construct message
                const message = `${action} ${isSuccess ? 'successful' : 'failed'}`;

                // Only log successful operations as errors are handled by global error handler
                if (isSuccess) {
                    await db.insert(systemLogs).values({
                        logLevel,
                        componentName: component,
                        message,
                        action: action,
                        apiEndpoint: req.originalUrl,
                        userId: effectiveUserId,
                        ipAddress: ip as string,
                        userAgent: userAgent,
                    });
                }
            } catch (err) {
                // Fail silently to not affect the API response, but log to console
                console.error('Activity logging failed:', err);
            }
        });

        next();
    };
};
