import { Request, Response } from 'express';
import { signAccessToken } from '../config/jwt';
import db from '../config/db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import { success } from '../utils/response';
import { redis } from '../config/redis';
import { userService } from '../services/userService';

import { authOtpService } from '../services/authOtpService';
import { createRefresh, verifyRefresh, revokeRefresh } from '../auth/authService';
import { onboardingService } from '../services/onboarding.service';
import { kycService } from '../services/kyc.service';

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
  console.log(req.body)
  const { phone, otp } = req.body;
  console.log('calling login with otp');
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
  const result = await authOtpService.loginWithPassword(phone, password);
  if (!result) return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });

  // create sessionId in redis
  const sessionId = `sess_${Math.random().toString(36).substring(2)}${Date.now()}`;
  const user = result.user;
  await redis.set(sessionId, JSON.stringify({ userId: user.id }), { EX: 60 * 60 * 24 * 7 });
  res.json(success(result));
};

export const register = async (req: Request, res: Response) => {
    const result = await onboardingService.registerUser(req.body);
    res.status(201).json(success(result, 'User registered successfully'));
};
export const verifyKyc = async (req: Request, res: Response) => {
    const { type, value } = req.body;
    const result = await kycService.verifyDocument(type, value);
    res.json(success(result));
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, error: { message: 'Missing refreshToken' } });
  const userId = await verifyRefresh(refreshToken);
  if (!userId) return res.status(401).json({ success: false, error: { message: 'Invalid refresh token' } });

  // rotate refresh token
  await revokeRefresh(refreshToken);
  const newRefresh = await createRefresh(userId);
  const accessToken = signAccessToken({ userId });
  res.json(success({ accessToken, refreshToken: newRefresh }));
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) await revokeRefresh(refreshToken);
  // also remove sessionId cookie/header if set
  res.json(success({ loggedOut: true }));
};
