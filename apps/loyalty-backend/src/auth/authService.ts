import { redis } from '../config/redis';
import { sign as jwtSign, verify as jwtVerify } from './jwt';
import { validateApiKey } from './apikey';

// Session helper using Redis
export const createSession = async (sessionId: string, payload: any, ttl = 60 * 60 * 24) => {
  await redis.set(sessionId, JSON.stringify(payload), { EX: ttl });
};

export const getSession = async (sessionId: string) => {
  const raw = await redis.get(sessionId);
  return raw ? JSON.parse(raw) : null;
};

export const deleteSession = async (sessionId: string) => {
  await redis.del(sessionId);
};

// Auth middleware helpers
export const authenticateToken = (token: string) => {
  try {
    return jwtVerify(token as any);
  } catch (err) {
    return null;
  }
};

export const authenticateApiKey = (key: string) => {
  return validateApiKey(key);
};

// Note: For full Auth.js integration, install `@auth/core` and the adapters you need.
// This file provides small helpers to integrate with Auth.js or to use bespoke JWT/session logic.
