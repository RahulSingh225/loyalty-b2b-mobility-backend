import { userService } from './userService';
import { redis } from '../config/redis';
import { signToken } from '../config/jwt';
import { sendOtpMessage } from '../mq/mqService';
import { randomInt } from 'crypto';

const OTP_TTL = 300; // 5 min

export class AuthOtpService {
  async loginWithPassword(phone: string, password: string) {
    const [user] = await userService.findOne({ phone });
    if (!user || user.password !== password) return null;
    const token = signToken({ userId: user.id });
    return { token, user: { id: user.id, name: user.name, phone: user.phone } };
  }

  async sendOtp(phone: string, channel: 'sms'|'email', purpose: 'login'|'reset' = 'login') {
    const otp = randomInt(100000, 999999).toString();
    await redis.set(`otp:${purpose}:${phone}`, otp, { EX: OTP_TTL });
    await sendOtpMessage({ phone, otp, channel });
  }

  async verifyOtp(phone: string, otp: string, purpose: 'login'|'reset' = 'login') {
    const stored = await redis.get(`otp:${purpose}:${phone}`);
    if (stored !== otp) return false;
    await redis.del(`otp:${purpose}:${phone}`);
    return true;
  }

  async loginWithOtp(phone: string, otp: string) {
    const ok = await this.verifyOtp(phone, otp, 'login');
    if (!ok) return null;
    const [user] = await userService.findOne({ phone });
    if (!user) return null;
    const token = signToken({ userId: user.id });
    return { token, user: { id: user.id, name: user.name, phone: user.phone } };
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
