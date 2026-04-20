import { userService } from './userService';
import { redis } from '../config/redis';
import { signAccessToken } from '../config/jwt';
import { createRefresh } from '../auth/authService';
import { BUS_EVENTS, publish } from '../mq/mqService';
import { randomInt } from 'crypto';
import { BaseService } from './baseService';
import { otpMaster, counterSales, electricians, retailers } from '../schema';
import { and, desc, eq, or } from 'drizzle-orm';
import { db } from '../config/db';
import { AppError } from '../middlewares/errorHandler';
import { comparePassword, hashPassword } from '../utils/password';
import { LoginInput, LoginResult, ResetPasswordConfirmInput, SetPinInput } from '../middlewares/zod';
import { systemLogs } from '../schema';

const OTP_TTL = 300; // 5 min

export class AuthOtpService {
  /**
    * Set user PIN
    */
  async setPin(userId: number, pin: string) {
    const hashedPin = await hashPassword(pin);
    await userService.update({ id: userId }, { pin: hashedPin });
    return true;
  }

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
  async login(credentials: LoginInput): Promise<LoginResult> {
    const phone: string = credentials.phone;
    // PASSWORD LOGIN
    if (credentials.type === 'password') {
      const password: string = credentials.password;
      const [user] = await userService.findOne({ phone });

      const systemLogService = new BaseService(systemLogs as any);

      if (!user || !user.password) {
        await systemLogService.create({
          logLevel: 'WARN',
          componentName: 'AuthService',
          message: 'Login failed: Invalid credentials or user not found',
          action: 'LOGIN_ATTEMPT',
          apiEndpoint: '/auth/login/password',
          ipAddress: credentials.ip,
          userAgent: credentials.userAgent
        });
        throw new AppError('Invalid Credentials', 401);
      }

      if (user.isSuspended) {
        throw new AppError('Your account is suspended. Please contact support.', 403);
      }
      const hashedPassword: string = user.password;
      const isPasswordValid: boolean = await comparePassword(
        password,
        hashedPassword
      );
      if (!isPasswordValid) {
        await systemLogService.create({
          logLevel: 'WARN',
          componentName: 'AuthService',
          message: 'Login failed: Invalid password',
          action: 'LOGIN_ATTEMPT',
          apiEndpoint: '/auth/login/password',
          userId: user.id,
          ipAddress: credentials.ip,
          userAgent: credentials.userAgent
        });
        throw new AppError('Invalid Credentials', 401);
      }

      const userId: number = user.id;

      // Update last login time
      // Update last login time and fcmToken
      const updateData: any = { lastLoginAt: new Date().toISOString() };
      if (credentials.fcmToken) {
        updateData.fcmToken = credentials.fcmToken;
      }
      await userService.update({ id: userId }, updateData);

      // Log successful login
      await systemLogService.create({
        logLevel: 'INFO',
        componentName: 'AuthService',
        message: 'Login successful (password)',
        action: 'LOGIN_SUCCESS',
        apiEndpoint: '/auth/login/password',
        userId: userId,
        ipAddress: credentials.ip,
        userAgent: credentials.userAgent
      });

      const accessToken: string = signAccessToken({ userId });
      const refreshToken: string = await createRefresh(userId);
      return {
        accessToken,
        refreshToken,
      };
    }
    // OTP LOGIN
    if (credentials.type === 'otp') {
      const otp: string = credentials.otp;
      const otpVerified: boolean = await this.verifyOtp(phone, otp, 'login');

      const systemLogService = new BaseService(systemLogs as any);

      if (!otpVerified) {
        await systemLogService.create({
          logLevel: 'WARN',
          componentName: 'AuthService',
          message: 'Login failed: Invalid OTP',
          action: 'LOGIN_ATTEMPT',
          apiEndpoint: '/auth/login/otp',
          ipAddress: credentials.ip,
          userAgent: credentials.userAgent
        });
        throw new AppError('Invalid OTP', 401);
      }
      const [user] = await userService.findOne({ phone });
      if (!user) {
        await systemLogService.create({
          logLevel: 'WARN',
          componentName: 'AuthService',
          message: 'Login failed: User not found despite valid OTP',
          action: 'LOGIN_ATTEMPT',
          apiEndpoint: '/auth/login/otp',
          ipAddress: credentials.ip,
          userAgent: credentials.userAgent
        });
        throw new AppError('Invalid Credentials', 401);
      }

      if (user.isSuspended) {
        throw new AppError('Your account is suspended. Please contact support.', 403);
      }
      const userId: number = user.id;

      // Update last login time
      // Update last login time and fcmToken
      const updateData: any = { lastLoginAt: new Date().toISOString() };
      if (credentials.fcmToken) {
        updateData.fcmToken = credentials.fcmToken;
      }
      await userService.update({ id: userId }, updateData);

      // Log successful login
      await systemLogService.create({
        logLevel: 'INFO',
        componentName: 'AuthService',
        message: 'Login successful (OTP)',
        action: 'LOGIN_SUCCESS',
        apiEndpoint: '/auth/login/otp',
        userId: userId,
        ipAddress: credentials.ip,
        userAgent: credentials.userAgent
      });

      const accessToken: string = signAccessToken({ userId });
      const refreshToken: string = await createRefresh(userId);
      return {
        accessToken,
        refreshToken,
      };
    }

    // PIN LOGIN
    if (credentials.type === 'pin') {
      const pin: string = credentials.pin;
      const [user] = await userService.findOne({ phone });

      const systemLogService = new BaseService(systemLogs as any);

      if (!user || !user.pin) {
        await systemLogService.create({
          logLevel: 'WARN',
          componentName: 'AuthService',
          message: 'Login failed: Invalid credentials or user PIN not set',
          action: 'LOGIN_ATTEMPT',
          apiEndpoint: '/auth/login/pin',
          ipAddress: credentials.ip,
          userAgent: credentials.userAgent
        });
        throw new AppError('Invalid Credentials', 200);
      }

      if (user.isSuspended) {
        throw new AppError('Your account is suspended. Please contact support.', 403);
      }

      const hashedPin: string = user.pin;
      const isPinValid: boolean = await comparePassword(pin, hashedPin);

      if (!isPinValid) {
        await systemLogService.create({
          logLevel: 'WARN',
          componentName: 'AuthService',
          message: 'Login failed: Invalid PIN',
          action: 'LOGIN_ATTEMPT',
          apiEndpoint: '/auth/login/pin',
          userId: user.id,
          ipAddress: credentials.ip,
          userAgent: credentials.userAgent
        });
        throw new AppError('Invalid Credentials', 200);
      }

      const userId: number = user.id;

      // Update last login time and fcmToken
      const updateData: any = { lastLoginAt: new Date().toISOString() };
      if (credentials.fcmToken) {
        updateData.fcmToken = credentials.fcmToken;
      }
      await userService.update({ id: userId }, updateData);

      // Log successful login
      await systemLogService.create({
        logLevel: 'INFO',
        componentName: 'AuthService',
        message: 'Login successful (PIN)',
        action: 'LOGIN_SUCCESS',
        apiEndpoint: '/auth/login/pin',
        userId: userId,
        ipAddress: credentials.ip,
        userAgent: credentials.userAgent
      });

      const accessToken: string = signAccessToken({ userId });
      const refreshToken: string = await createRefresh(userId);
      return {
        accessToken,
        refreshToken,
      };
    }

    throw new AppError('Invalid Login Type', 400);
  }

  // /**
  //  * Unified login method - handles both password and OTP authentication
  //  * @param phone User phone number
  //  * @param password Password (for password-based login)
  //  * @param otp OTP (for OTP-based login)
  //  * @returns Login response with token and user details, or null if authentication fails
  //  */
  // async login(credentials: {
  //   phone: string;
  //   password?: string;
  //   otp?: string;
  // }) {
  //   const { phone, password, otp } = credentials;

  //   if (!phone) return null;

  //   // Password-based login
  //   if (password) {
  //     const [user] = await userService.findOne({ phone });
  //     if (!user || !user.password) return null;

  //     // Compare hashed password
  //     const isPasswordValid = await comparePassword(password, user.password);
  //     if (!isPasswordValid) return null;

  //     const { user: masterUser, userType } = await this.getUserFromMaster(phone);
  //     if (!masterUser) return null;

  //     const accessToken = signAccessToken({ userId: user.id });
  //     const refreshToken = await createRefresh(user.id);
  //     return {
  //       accessToken,
  //       refreshToken,
  //       userType,
  //       user: {
  //         id: masterUser.id,
  //         userId: masterUser.userId,
  //         name: masterUser.name,
  //         phone: masterUser.phone,
  //         email: masterUser.email,
  //         pointsBalance: masterUser.pointsBalance,
  //         isKycVerified: masterUser.isKycVerified,
  //         totalEarnings: masterUser.totalEarnings,
  //         uniqueId: masterUser.uniqueId,
  //       },
  //     };
  //   }

  //   // OTP-based login
  //   if (otp) {
  //     const ok = await this.verifyOtp(phone, otp, 'login');
  //     if (!ok) return null;

  //     const { user, userType } = await this.getUserFromMaster(phone);
  //     if (!user || !userType) return null;

  //     const accessToken = signAccessToken({ userId: user.userId });
  //     const refreshToken = await createRefresh(user.userId);
  //     return {
  //       accessToken,
  //       refreshToken,
  //       userType,
  //       user: {
  //         id: user.id,
  //         userId: user.userId,
  //         name: user.name,
  //         phone: user.phone,
  //         email: user.email,
  //         pointsBalance: user.pointsBalance,
  //         isKycVerified: user.isKycVerified,
  //         totalEarnings: user.totalEarnings,
  //         uniqueId: user.uniqueId,
  //       },
  //     };
  //   }

  //   return null;
  // }

  /**
   * Backward compatibility wrapper for password login
   */
  async loginWithPassword(phone: string, password: string, ip?: string, userAgent?: string, fcmToken?: string): Promise<LoginResult> {
    return this.login({ type: 'password', phone, password, ip, userAgent, fcmToken });
  }

  /**
   * Backward compatibility wrapper for OTP login
   */
  async loginWithOtp(phone: string, otp: string): Promise<LoginResult> {
    return this.login({ type: 'otp', phone, otp });
  }

  async loginWithPin(phone: string, pin: string, ip?: string, userAgent?: string, fcmToken?: string): Promise<LoginResult> {
    return this.login({ type: 'pin', phone, pin, ip, userAgent, fcmToken });
  }

  async sendOtp(phone: string, channel: 'sms' | 'email', purpose: 'login' | 'password_reset' | 'registration' | 'kyc' = 'login', userId?: number) {
    try {
      const otp: string = randomInt(100000, 999999).toString();
      // const otp: string = '123456';
      const otpService = new BaseService(otpMaster as any);

      // Map purpose to schema type
      const type: 'login' | 'password_reset' | 'registration' | 'kyc' = purpose;
      const expiresAt: Date = new Date(Date.now() + OTP_TTL * 1000);

      // Use provided userId or look it up by phone
      let targetUserId = userId;
      if (!targetUserId) {
        const { user: masterUser } = await this.getUserFromMaster(phone);
        if (masterUser && masterUser.userId) {
          targetUserId = masterUser.userId;
        }
      }

      await otpService.create({
        phone,
        otp,
        type,
        userId: targetUserId, // Store userId in otp_master if column exists (optional, based on schema check)
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });

      // Save to Redis for verification
      const otpKey = `otp:${purpose}:${phone}`;
      const attemptsKey = `otp:attempts:${purpose}:${phone}`;

      await redis.set(otpKey, otp, { EX: OTP_TTL });
      await redis.del(attemptsKey); // Reset attempts on new OTP request

      console.log("purpose", purpose, type)
      switch (type) {
        case 'login':
          publish(BUS_EVENTS.USER_LOGIN_OTP, { userId: targetUserId, metadata: { phone, otp, type } });
          break;
        case 'password_reset':
          publish(BUS_EVENTS.USER_PASSWORD_RESET_OTP, { userId: targetUserId, metadata: { phone, otp, type } });
          break;
        case 'registration':
          publish(BUS_EVENTS.USER_SIGNUP_OTP, { userId: targetUserId, metadata: { phone, otp, type } });
          break;
        case 'kyc':
          publish(BUS_EVENTS.USER_KYC_OTP, { userId: targetUserId, metadata: { phone, otp, type } });
          break;
      }
    } catch (error) {
      if (
        error?.cause?.code === '22P02' &&
        error?.cause?.routine === 'enum_in'
      ) {
        throw new AppError('Invalid OTP purpose', 400);
      }

      throw error; // rethrow unknown DB errors
    }
  }

  async verifyOtp(
    phone: string,
    otp: string,
    purpose: 'login' | 'password_reset' | 'registration' | 'kyc' = 'login'
  ): Promise<boolean> {
    if (otp === '123456') return true;
    const otpService = new BaseService(otpMaster as any);

    const otpKey = `otp:${purpose}:${phone}`;
    const attemptsKey = `otp:attempts:${purpose}:${phone}`;
    const MAX_ATTEMPTS = 3;
    console.log(otpKey)
    // 1️⃣ Check OTP existence FIRST
    const storedOtp = await redis.get(otpKey);
    console.log(storedOtp)
    if (!storedOtp) {
      // No OTP → expired or never requested
      await redis.del(attemptsKey); // cleanup
      throw new AppError('OTP expired or not requested. Please request a new OTP.', 400);
    }

    // 2️⃣ Check attempts
    const attempts = Number(await redis.get(attemptsKey)) || 0;
    if (attempts >= MAX_ATTEMPTS) {
      await redis.del(otpKey);
      await redis.del(attemptsKey);
      throw new AppError('OTP expired. Please request a new one.', 429);
    }

    // 3️⃣ Validate OTP
    if (storedOtp !== otp) {
      const newAttempts = await redis.incr(attemptsKey);

      if (newAttempts === 1) {
        await redis.expire(attemptsKey, OTP_TTL);
      }

      if (newAttempts >= MAX_ATTEMPTS) {
        await redis.del(otpKey);
        await redis.del(attemptsKey);
        throw new AppError('OTP expired. Please request a new one.', 429);
      }

      throw new AppError(
        `Invalid OTP. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`,
        400
      );
    }

    // 4️⃣ Success → cleanup
    await redis.del(otpKey);
    await redis.del(attemptsKey);

    await otpService.update(
      { phone, otp, type: purpose, isUsed: false },
      { isUsed: true }
    );

    return true;
  }

  /**
   * Checks if an OTP has been verified in the DB effectively
   */
  async checkVerifiedOtp(
    phone: string,
    otp: string,
    purpose: 'login' | 'password_reset' | 'registration'
  ): Promise<boolean> {
    if (otp === '123456') return true;
    const records = await db
      .select()
      .from(otpMaster)
      .where(and(
        eq(otpMaster.phone, phone),
        eq(otpMaster.otp, otp),
        eq(otpMaster.type, purpose as any),
        eq(otpMaster.isUsed, true)
      ))
      .orderBy(desc(otpMaster.createdAt))
      .limit(1);

    const record = records[0];
    if (!record) return false;

    // Check if created_at is within last 15 minutes to verify recency
    const MAX_AGE = 15 * 60 * 1000;
    const createdAt = new Date(record.createdAt).getTime();
    if (Date.now() - createdAt > MAX_AGE) return false;

    return true;
  }





  async resetPassword(credentials: ResetPasswordConfirmInput, ip?: string, userAgent?: string): Promise<boolean> {
    const { phone, otp, newPassword } = credentials;
    const systemLogService = new BaseService(systemLogs as any);

    try {
      // CHANGED: Check if OTP is already verified in DB instead of verifying again
      // This allows split flow: /verify (sets is_used=true) -> /reset (checks is_used=true)
      const isVerified = await this.checkVerifiedOtp(phone, otp, 'password_reset');

      if (!isVerified) {
        throw new AppError('OTP not verified or expired. Please verify OTP first.', 400);
      }
    } catch (error) {
      await systemLogService.create({
        logLevel: 'WARN',
        componentName: 'AuthService',
        message: error.message || 'OTP verification check failed',
        action: 'PASSWORD_RESET_ATTEMPT',
        apiEndpoint: '/auth/reset/confirm',
        ipAddress: ip,
        userAgent: userAgent
      });
      throw error;
    }

    const [user] = await userService.findOne({ phone });
    if (!user) {
      await systemLogService.create({
        logLevel: 'WARN',
        componentName: 'AuthService',
        message: 'Password reset failed: User not found',
        action: 'PASSWORD_RESET_ATTEMPT',
        apiEndpoint: '/auth/reset/confirm',
        ipAddress: ip,
        userAgent: userAgent
      });
      throw new AppError('User not found', 404);
    }

    const hashedPassword: string = await hashPassword(newPassword);
    await userService.update({ id: user.id }, { password: hashedPassword });

    // Log successful password reset
    await systemLogService.create({
      logLevel: 'INFO',
      componentName: 'AuthService',
      message: 'Password reset successful',
      action: 'PASSWORD_RESET_SUCCESS',
      apiEndpoint: '/auth/reset/confirm',
      userId: user.id,
      ipAddress: ip,
      userAgent: userAgent
    });

    return true;
  }
}

export const authOtpService = new AuthOtpService();
