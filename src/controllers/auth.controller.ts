import { Request, Response } from 'express';
import { signToken } from '../config/jwt';
import db from '../config/db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import { success } from '../utils/response';
import { redis } from '../config/redis';
import { userService } from '../services/userService';

import { authOtpService } from '../services/authOtpService';

// --- OTP/PASSWORD/RESET LOGIC ---
export const loginWithPassword = async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  const result = await authOtpService.loginWithPassword(phone, password);
  if (!result) return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
  res.json(success(result));
};

export const sendOtp = async (req: Request, res: Response) => {
  const { phone, channel } = req.body;
  await authOtpService.sendOtp(phone, channel);
  res.json(success({ sent: true }));
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  const result = await authOtpService.verifyOtp(phone, otp);
  if (!result) return res.status(401).json({ success: false, error: { message: 'Invalid OTP' } });
  res.json(success(result));
};

export const loginWithOtp = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  const result = await authOtpService.loginWithOtp(phone, otp);
  if (!result) return res.status(401).json({ success: false, error: { message: 'Invalid OTP' } });
  res.json(success(result));
};

export const resetPasswordRequest = async (req: Request, res: Response) => {
  const { phone, channel } = req.body;
  await authOtpService.sendOtp(phone, channel, 'reset');
  res.json(success({ sent: true }));
};

export const resetPasswordConfirm = async (req: Request, res: Response) => {
  const { phone, otp, newPassword } = req.body;
  const ok = await authOtpService.resetPassword(phone, otp, newPassword);
  if (!ok) return res.status(401).json({ success: false, error: { message: 'Invalid OTP or phone' } });
  res.json(success({ reset: true }));
};

export const login = async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  const [user] = await userService.findOne(eq(users.phone, phone));
  
  if (!user || user.password !== password) { // In prod, hash passwords
    return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
  }
  const token = signToken({ userId: user.id });
  // create server session id in redis
  const sessionId = `sess:${user.id}:${Date.now()}`;
  await redis.set(sessionId, JSON.stringify({ userId: user.id }), { EX: 60 * 60 * 24 * 7 });
  res.json(success({ token, sessionId, user: { id: user.id, name: user.name } }));
};

export const register = async (req: Request, res: Response) => {
  // Simplified; add full validation
  const userData = req.body;
  const [newUser] = await db.insert(users).values(userData).returning();
  const token = signToken({ userId: newUser.id });
  res.status(201).json(success({ token, user: newUser }));
};
