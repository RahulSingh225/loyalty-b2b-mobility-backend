import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';
import { db } from '../config/db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import { redis } from '../config/redis';
import { auth } from 'firebase-admin';

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
      const payload = verifyAccessToken(token) as any;
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

export const authenticateGyftr = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
console.log(authHeader);
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }

  const token = authHeader.split(' ')[1];
  console.log(token)

  try {
    const payload = verifyAccessToken(token) as any;
console.log(payload)
    if (payload.type !== 'gyftr') {
      return res.status(401).json({ success: false, error: { message: 'Invalid token type' } });
    }

    const userId = payload.userId;
    const redisKey = `gyftr-${userId}`;

    const storedToken = await redis.get(redisKey);
    console.log(storedToken)
    if (!storedToken || storedToken !== token) {
      return res.status(401).json({ success: false, error: { message: 'Session expired or invalid' } });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'User not found' } });
    }

    (req as any).user = user;
    (req as any).auth = { type: 'gyftr' };

    return next();
  } catch (err) {
    console.log(err)  
    return res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};

export const authenticateUnified = async (req: Request, res: Response, next: NextFunction) => {
  const channelPartner = req.headers['x-channel-partner'];
  const apiKey = req.headers['x-api-key'];

  if (channelPartner && apiKey) {
    console.log('Authenticating with Gyftr...');
    console.log('Channel Partner:', channelPartner);
    console.log('API Key:', apiKey);
    return authenticateGyftr(req, res, next);
  }

  return authenticate(req, res, next);
};
