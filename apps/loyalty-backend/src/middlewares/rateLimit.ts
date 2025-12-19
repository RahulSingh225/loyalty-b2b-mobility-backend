import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';

export const rateLimit = (limit: number = 100, windowMs: number = 60000) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rate:${req.ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowMs / 1000);
    if (count > limit) return res.status(429).json({ success: false, error: { message: 'Too many requests' } });
    next();
  };
};
