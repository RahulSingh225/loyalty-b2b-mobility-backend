import { BaseService } from './baseService';
import { referrals, users } from '../schema';
import { z } from 'zod';

const userZ = z.object({
  roleId: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
});

const profileZ = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

class UserService extends BaseService<typeof users> {
  getReferralsHistory(id: any, opts: { page: number; pageSize: number; }) {
    const refferralService = new BaseService(referrals as any);
    return refferralService.findManyPaginated({ referrerId: id }, opts);
  }
  async getProfile(userId: number) {
    const [user] = await this.findOne({ id: userId });
    return user;
  }
  async updateProfile(userId: number, updates: any) {
    profileZ.parse(updates);
    const [updated] = await this.update({ id: userId }, updates);
    return updated;
  }
}

export const userService = new UserService(users as any, userZ);
