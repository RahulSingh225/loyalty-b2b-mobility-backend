import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';
import { db } from '../config/db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import { redis } from '../config/redis';

// Middleware supports: Authorization: Bearer <jwt>, x-api-key header, or session cookie 'sessionId'
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

  // API key
  if (apiKey && apiKey === process.env.API_KEY) {
    // Optionally, map api key to a system user
    (req as any).auth = { type: 'apikey' };
    return next();
  }

  // JWT
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyToken(token) as any;
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
      (req as any).user = user;
      (req as any).auth = { type: 'jwt' };
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
    }
  }

  // Session (Redis)
  if (sessionId) {
    try {
      const raw = await redis.get(String(sessionId));
      if (!raw) return res.status(401).json({ success: false, error: { message: 'Invalid session' } });
      const session = JSON.parse(raw);
      const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
      if (!user) return res.status(401).json({ success: false, error: { message: 'Invalid session' } });
      (req as any).user = user;
      (req as any).auth = { type: 'session' };
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, error: { message: 'Invalid session' } });
    }
  }

  return res.status(401).json({ success: false, error: { message: 'No credentials provided' } });
};
