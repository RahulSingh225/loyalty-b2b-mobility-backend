import { BaseService } from './baseService';
import { users } from '../schema';
import { z } from 'zod';

const userZ = z.object({
  roleId: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
});

export const userService = new BaseService(users as any, userZ);
