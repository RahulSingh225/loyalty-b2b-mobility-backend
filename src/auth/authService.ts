import { redis } from '../config/redis';
import { signRefreshToken, verifyRefreshToken } from '../config/jwt';
import { validateApiKey } from './apikey';
import { randomUUID } from 'crypto';

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
    // Access token is expected to be a JWT; verification handled by middleware using config/jwt
    return token;
  } catch (err) {
    return null;
  }
};

export const authenticateApiKey = (key: string) => {
  return validateApiKey(key);
};

// Refresh token management
export const createRefresh = async (userId: number, ttlDays = 30) => {
  // create a random id and store mapping in redis for quick revocation
  const token = randomUUID();
  const key = `refresh:${token}`;
  await redis.set(key, String(userId), { EX: ttlDays * 24 * 60 * 60 });
  return token;
};

export const verifyRefresh = async (token: string) => {
  const key = `refresh:${token}`;
  const raw = await redis.get(key);
  return raw ? parseInt(raw) : null;
};

export const revokeRefresh = async (token: string) => {
  const key = `refresh:${token}`;
  await redis.del(key);
};

// Note: For full Auth.js integration, install `@auth/core` and the adapters you need.
// This file provides small helpers to integrate with Auth.js or to use bespoke JWT/session logic.
