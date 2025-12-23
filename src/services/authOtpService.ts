import { userService } from './userService';
import { redis } from '../config/redis';
import { signAccessToken } from '../config/jwt';
import { createRefresh } from '../auth/authService';
import { sendOtpMessage } from '../mq/mqService';
import { randomInt } from 'crypto';
import { BaseService } from './baseService';
import { otps, counterSales, electricians, retailers } from '../schema';
import { eq, or } from 'drizzle-orm';
import { db } from '../config/db';

const OTP_TTL = 300; // 5 min

export class AuthOtpService {
  /**
   * Helper to determine user type and fetch from appropriate master table
   */
  private async getUserFromMaster(phone: string, userId?: number) {
    let user: any = null;
    let userType = '';

    // If userId provided, search across all master tables
    if (userId) {
      const [cs] = await db
        .select({
          id: counterSales.id,
          userId: counterSales.userId,
          name: counterSales.name,
          phone: counterSales.phone,
          email: counterSales.email,
          pointsBalance: counterSales.pointsBalance,
          isKycVerified: counterSales.isKycVerified,
          totalEarnings: counterSales.totalEarnings,
          uniqueId: counterSales.uniqueId,
        })
        .from(counterSales)
        .where(eq(counterSales.userId, userId))
        .limit(1);

      if (cs) {
        user = cs;
        userType = 'counter_sales';
        return { user, userType };
      }

      const [ec] = await db
        .select({
          id: electricians.id,
          userId: electricians.userId,
          name: electricians.name,
          phone: electricians.phone,
          email: electricians.email,
          pointsBalance: electricians.pointsBalance,
          isKycVerified: electricians.isKycVerified,
          totalEarnings: electricians.totalEarnings,
          uniqueId: electricians.uniqueId,
        })
        .from(electricians)
        .where(eq(electricians.userId, userId))
        .limit(1);

      if (ec) {
        user = ec;
        userType = 'electrician';
        return { user, userType };
      }

      const [rt] = await db
        .select({
          id: retailers.id,
          userId: retailers.userId,
          name: retailers.name,
          phone: retailers.phone,
          email: retailers.email,
          pointsBalance: retailers.pointsBalance,
          isKycVerified: retailers.isKycVerified,
          totalEarnings: retailers.totalEarnings,
          uniqueId: retailers.uniqueId,
        })
        .from(retailers)
        .where(eq(retailers.userId, userId))
        .limit(1);

      if (rt) {
        user = rt;
        userType = 'retailer';
        return { user, userType };
      }
    }

    // If phone provided, search across all master tables
    if (phone) {
      const [cs] = await db
        .select({
          id: counterSales.id,
          userId: counterSales.userId,
          name: counterSales.name,
          phone: counterSales.phone,
          email: counterSales.email,
          pointsBalance: counterSales.pointsBalance,
          isKycVerified: counterSales.isKycVerified,
          totalEarnings: counterSales.totalEarnings,
          uniqueId: counterSales.uniqueId,
        })
        .from(counterSales)
        .where(eq(counterSales.phone, phone))
        .limit(1);

      if (cs) {
        user = cs;
        userType = 'counter_sales';
        return { user, userType };
      }

      const [ec] = await db
        .select({
          id: electricians.id,
          userId: electricians.userId,
          name: electricians.name,
          phone: electricians.phone,
          email: electricians.email,
          pointsBalance: electricians.pointsBalance,
          isKycVerified: electricians.isKycVerified,
          totalEarnings: electricians.totalEarnings,
          uniqueId: electricians.uniqueId,
        })
        .from(electricians)
        .where(eq(electricians.phone, phone))
        .limit(1);

      if (ec) {
        user = ec;
        userType = 'electrician';
        return { user, userType };
      }

      const [rt] = await db
        .select({
          id: retailers.id,
          userId: retailers.userId,
          name: retailers.name,
          phone: retailers.phone,
          email: retailers.email,
          pointsBalance: retailers.pointsBalance,
          isKycVerified: retailers.isKycVerified,
          totalEarnings: retailers.totalEarnings,
          uniqueId: retailers.uniqueId,
        })
        .from(retailers)
        .where(eq(retailers.phone, phone))
        .limit(1);

      if (rt) {
        user = rt;
        userType = 'retailer';
        return { user, userType };
      }
    }

    return { user: null, userType: '' };
  }

  /**
   * Unified login method - handles both password and OTP authentication
   * @param phone User phone number
   * @param password Password (for password-based login)
   * @param otp OTP (for OTP-based login)
   * @returns Login response with token and user details, or null if authentication fails
   */
  async login(credentials: {
    phone: string;
    password?: string;
    otp?: string;
  }) {
    const { phone, password, otp } = credentials;

    if (!phone) return null;

    // Password-based login
    if (password) {
      const [user] = await userService.findOne({ phone });
      if (!user || user.password !== password) return null;

      const { user: masterUser, userType } = await this.getUserFromMaster(phone);
      if (!masterUser) return null;

      const accessToken = signAccessToken({ userId: user.id });
      const refreshToken = await createRefresh(user.id);
      return {
        accessToken,
        refreshToken,
        userType,
        user: {
          id: masterUser.id,
          userId: masterUser.userId,
          name: masterUser.name,
          phone: masterUser.phone,
          email: masterUser.email,
          pointsBalance: masterUser.pointsBalance,
          isKycVerified: masterUser.isKycVerified,
          totalEarnings: masterUser.totalEarnings,
          uniqueId: masterUser.uniqueId,
        },
      };
    }

    // OTP-based login
    if (otp) {
      const ok = await this.verifyOtp(phone, otp, 'login');
      if (!ok) return null;

      const { user, userType } = await this.getUserFromMaster(phone);
      if (!user || !userType) return null;

      const accessToken = signAccessToken({ userId: user.userId });
      const refreshToken = await createRefresh(user.userId);
      return {
        accessToken,
        refreshToken,
        userType,
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          phone: user.phone,
          email: user.email,
          pointsBalance: user.pointsBalance,
          isKycVerified: user.isKycVerified,
          totalEarnings: user.totalEarnings,
          uniqueId: user.uniqueId,
        },
      };
    }

    return null;
  }

  /**
   * Backward compatibility wrapper for password login
   */
  async loginWithPassword(phone: string, password: string) {
    return this.login({ phone, password });
  }

  /**
   * Backward compatibility wrapper for OTP login
   */
  async loginWithOtp(phone: string, otp: string) {
    return this.login({ phone, otp });
  }

  async sendOtp(phone: string, channel: 'sms' | 'email', purpose: 'login' | 'reset' = 'login') {
    const otp = randomInt(100000, 999999).toString();
    const otpService = new BaseService(otps as any);

    // Map purpose to schema type
    const type = purpose === 'reset' ? 'password_reset' : 'login';
    const expiresAt = new Date(Date.now() + OTP_TTL * 1000);

    await otpService.create({
      phone,
      otp,
      type,
      expires_at: expiresAt,
      created_at: new Date()
    });

    await redis.set(`otp:${purpose}:${phone}`, otp, { EX: OTP_TTL });
    await sendOtpMessage({ phone, otp, channel });
  }

  async verifyOtp(phone: string, otp: string, purpose: 'login' | 'reset' = 'login') {
    const otpService = new BaseService(otps as any);

    const type = purpose === 'reset' ? 'password_reset' : 'login';

    // Check in DB (optional but good for audit)
    // Note: findOne uses the object properties, so we need to match schema keys
    await otpService.findOne({ phone, otp, type, is_used: false });

    const stored = await redis.get(`otp:${purpose}:${phone}`);
    if (stored !== otp) return false;

    // Mark as used in DB
    // We don't have a direct update by criteria in BaseService easily accessible here without knowing ID
    // but we can at least clean up Redis
    await redis.del(`otp:${purpose}:${phone}`);
    return true;
  }

  async resetPassword(phone: string, otp: string, newPassword: string) {
    const ok = await this.verifyOtp(phone, otp, 'reset');
    if (!ok) return false;

    const [user] = await userService.findOne({ phone });
    if (!user) return false;

    await userService.update({ id: user.id }, { password: newPassword });
    return true;
  }
}

export const authOtpService = new AuthOtpService();
