import { Request, Response } from 'express';
import { redis } from '../config/redis';
import { signAccessToken } from '../config/jwt';
import { success } from '../utils/response';

export const getGyftrSession = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId = user.id;

    // Generate a new token for Gyftr session
    const gyftrToken = signAccessToken({ userId, type: 'gyftr' }, '30m');

    // Key format: gyftr-<userId>
    const redisKey = `gyftr-${userId}`;

    // Store the token in Redis with 30 minutes TTL (1800 seconds)
    // set command overwrites by default
    await redis.set(redisKey, gyftrToken, {
        EX: 1800
    });

    const dummyUrl = `${process.env.GYFTR_URL}?token=${gyftrToken}`;
    res.json(success({ url: dummyUrl }));
};