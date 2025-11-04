import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';
import { db } from '../config/db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: { message: 'No token' } });

  try {
    const payload = verifyToken(token);
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) throw new Error();
    (req as any).user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: { message: 'Invalid token' } });
  }
};
