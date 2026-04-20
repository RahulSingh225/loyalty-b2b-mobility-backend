import { Request, Response } from 'express';
import { signAccessToken } from '../config/jwt';
import db from '../config/db';
import { users, approvalStatuses as approvalStatusesSchema } from '../schema';
import { eq } from 'drizzle-orm';
import { success } from '../utils/response';
import { authOtpService } from '../services/authOtpService';
import { createRefresh, verifyRefresh, revokeRefresh } from '../auth/authService';
import { onboardingService } from '../services/onboarding.service';
import { kycService } from '../services/kyc.service';
import { otpType } from '../schema';
import z from 'zod';
import { LoginResult, LoginWithPasswordSchema, LoginWithPasswordInput, SendOtpInput, VerifyOtpInput, OnboardingInput, OnboardingInputSchema, ResetPasswordConfirmInput, ResetPasswordConfirmSchema, ResetPasswordRequestSchema, ResetPasswordRequestInput, SendOtpSchema, VerifyOtpSchema, SetPinSchema, LoginWithPinSchema } from '../middlewares/zod';
import { cacheMaster } from '../utils/masterCache';
import { APPROVAL_STATUS } from '../utils/approvalStatus';

export const setPin = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || !user.id) return res.status(200).json({ success: false, error: { message: 'Unauthorized' } });

  const { pin } = SetPinSchema.parse(req.body);
  await authOtpService.setPin(user.id, pin);
  res.json(success({ success: true, message: 'PIN set successfully' }));
};

export const loginWithPin = async (req: Request, res: Response) => {
  const { phone, pin, fcmToken } = LoginWithPinSchema.parse(req.body);
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const result: LoginResult = await authOtpService.loginWithPin(phone, pin, ip, userAgent, fcmToken);
  res.json(success(result));
};

export const loginWithPassword = async (req: Request, res: Response) => {
  const { phone, password, fcmToken } = LoginWithPasswordSchema.parse(req.body);
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const result: LoginResult = await authOtpService.loginWithPassword(phone, password, ip, userAgent, fcmToken);
  res.json(success(result));
};

export const sendOtp = async (req: Request, res: Response) => {
  const { phone, channel, purpose } = SendOtpSchema.parse(req.body);
  await authOtpService.sendOtp(phone, channel, purpose);
  res.json(success({ sent: true }));
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { phone, otp, purpose } = VerifyOtpSchema.parse(req.body);
  const result = await authOtpService.verifyOtp(phone, otp, purpose);
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
  const { phone, channel } = ResetPasswordRequestSchema.parse(req.body);
  await authOtpService.sendOtp(phone, channel, 'password_reset');
  res.json(success({ sent: true }));
};

export const resetPasswordConfirm = async (req: Request, res: Response) => {
  const input: ResetPasswordConfirmInput = ResetPasswordConfirmSchema.parse(req.body);
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  await authOtpService.resetPassword(input, ip, userAgent);
  res.json(success({ reset: true }));
};

// export const login = async (req: Request, res: Response) => {
//   const { phone, password } = req.body;
//   const result = await authOtpService.loginWithPassword(phone, password);
//   if (!result) return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });

//   // create sessionId in redis
//   const sessionId = `sess_${Math.random().toString(36).substring(2)}${Date.now()}`;
//   const user = result.user;
//   await redis.set(sessionId, JSON.stringify({ userId: user.id }), { EX: 60 * 60 * 24 * 7 });
//   res.json(success(result));
// };

// Removing RegisterSchema usage
export const register = async (req: Request<{}, {}, OnboardingInput>, res: Response) => {
  // console.log('Registration payload:', req.body);
  const payload: OnboardingInput = OnboardingInputSchema.parse(req.body);
  
  const newUser = await onboardingService.registerUser(payload);

  // Set userId for activity logger middleware
  res.locals.newUserId = newUser.id;

  // Generate tokens for immediate login after registration
  const accessToken: string = signAccessToken({ userId: newUser.id });
  const refreshToken: string = await createRefresh(newUser.id);
  res.status(201).json(success({
    accessToken,
    refreshToken
  }, 'User registered successfully'));
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

// -------------------------------------------------------------------------
// REGISTRATION OTP WRAPPERS (Require Authentication + approvalStatus check)
// -------------------------------------------------------------------------

/**
 * Send OTP for registration flow
 * Requires: Authentication, approval status must be KYC_PENDING
 * @route POST /api/v1/auth/registration/otp/send
 */
export const sendRegistrationOtp = async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to check approvalStatus and get phone number
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  /* const approvalStatusesList = await cacheMaster('approvalStatuses', async () => db.select().from(approvalStatusesSchema).execute()); */
  const approvalStatusesList = await db.select().from(approvalStatusesSchema).execute();
  const onboardedId = approvalStatusesList.find((s: any) => s.name === APPROVAL_STATUS.ONBOARDED)?.id;

  // Validate approvalStatus is ONBOARDED
  if (userData.approvalStatusId !== onboardedId) {
    const currentStatusName = approvalStatusesList.find((s: any) => s.id === userData.approvalStatusId)?.name || 'Unknown';
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid user status for registration OTP',
        details: `Current status: ${currentStatusName}. Expected: ${APPROVAL_STATUS.ONBOARDED}`
      }
    });
  }

  // Check if user has a phone number
  if (!userData.phone) {
    return res.status(400).json({
      success: false,
      error: { message: 'User phone number not found' }
    });
  }

  // Validate request body (only channel is required)
  const { channel } = z.object({
    channel: z.enum(['sms', 'email'])
  }).parse(req.body);

  // Send OTP using user's phone number from database
  await authOtpService.sendOtp(userData.phone, channel, 'registration', userData.id);

  res.json(success({
    sent: true,
    message: 'Registration OTP sent successfully',
    phone: userData.phone // Return phone for confirmation
  }));
};

/**
 * Verify OTP for registration flow
 * Requires: Authentication, approval status must be KYC_PENDING
 * @route POST /api/v1/auth/registration/otp/verify
 */
export const verifyRegistrationOtp = async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: { message: 'User not authenticated' }
    });
  }

  // Fetch user to check approvalStatus and get phone number
  const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  /* const approvalStatusesList = await cacheMaster('approvalStatuses', async () => db.select().from(approvalStatusesSchema).execute()); */
  const approvalStatusesList = await db.select().from(approvalStatusesSchema).execute();
  const onboardedId = approvalStatusesList.find((s: any) => s.name === APPROVAL_STATUS.ONBOARDED)?.id;

  // Validate blockStatus is 'basic_registration' -> ONBOARDED
  if (userData.approvalStatusId !== onboardedId) {
    const currentStatusName = approvalStatusesList.find((s: any) => s.id === userData.approvalStatusId)?.name || 'Unknown';
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid user status for registration OTP verification',
        details: `Current status: ${currentStatusName}. Expected: ${APPROVAL_STATUS.ONBOARDED}`
      }
    });
  }

  // Check if user has a phone number
  if (!userData.phone) {
    return res.status(400).json({
      success: false,
      error: { message: 'User phone number not found' }
    });
  }

  // Validate request body (only OTP is required)
  const { otp } = z.object({
    otp: z.string().min(4, 'OTP must be at least 4 characters')
  }).parse(req.body);

  // Verify OTP using user's phone number from database
  const result = await authOtpService.verifyOtp(userData.phone, otp, 'registration');

  if (!result) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid OTP' }
    });
  }

  // Update user's approvalStatusId to 'PHONE_NUMBER_VERIFIED' after successful verification
  const verifiedId = approvalStatusesList.find((s: any) => s.name === APPROVAL_STATUS.PHONE_NUMBER_VERIFIED)?.id;
  if (verifiedId) {
    await db.update(users).set({ approvalStatusId: verifiedId }).where(eq(users.id, user.id));
  } else {
    console.warn('PHONE_NUMBER_VERIFIED status not found');
  }

  res.json(success({
    verified: true,
    message: 'Registration OTP verified successfully',
    status: APPROVAL_STATUS.PHONE_NUMBER_VERIFIED
  }));
};
