import { redis } from '../config/redis';

// Minimal adapter shape for storing sessions in Redis for Auth.js
export const redisAdapter = {
  async get(key: string) {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  },
  async set(key: string, value: any, ttlSeconds?: number) {
    const payload = JSON.stringify(value);
    if (ttlSeconds) await redis.set(key, payload, { EX: ttlSeconds });
    else await redis.set(key, payload);
  },
  async delete(key: string) {
    await redis.del(key);
  },
};
