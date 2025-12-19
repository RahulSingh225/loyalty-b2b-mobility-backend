import { redis } from '../config/redis';
import db from '../config/db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

const CACHE_PREFIX = 'master:';

export const cacheMaster = async (key: string, fetchFn: () => Promise<any>, ttlSeconds = 60 * 60) => {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const existing = await redis.get(cacheKey);
  if (existing) return JSON.parse(existing);
  const data = await fetchFn();
  await redis.set(cacheKey, JSON.stringify(data), { EX: ttlSeconds });
  return data;
};

export const refreshMaster = async (key: string, fetchFn: () => Promise<any>, ttlSeconds = 60 * 60) => {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const data = await fetchFn();
  await redis.set(cacheKey, JSON.stringify(data), { EX: ttlSeconds });
  return data;
};

export const initMasters = async () => {
  // Example: cache onboarding types, user types, languages, sku levels
  await cacheMaster('onboardingTypes', async () => db.select().from(schema.onboardingTypes).execute());
  await cacheMaster('userTypes', async () => db.select().from(schema.userTypeEntity).execute());
  await cacheMaster('languages', async () => db.select().from(schema.languages).execute());
  await cacheMaster('skuLevels', async () => db.select().from(schema.skuLevelMaster).execute());
};

// Scheduled refresh example: call refreshMaster periodically (cron or setInterval)
export const scheduleMasterRefresh = (intervalMs = 1000 * 60 * 60) => {
  setInterval(async () => {
    try {
      await refreshMaster('onboardingTypes', async () => db.select().from(schema.onboardingTypes).execute());
      await refreshMaster('userTypes', async () => db.select().from(schema.userTypeEntity).execute());
      await refreshMaster('languages', async () => db.select().from(schema.languages).execute());
      await refreshMaster('skuLevels', async () => db.select().from(schema.skuLevelMaster).execute());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Master refresh failed', err);
    }
  }, intervalMs);
};
