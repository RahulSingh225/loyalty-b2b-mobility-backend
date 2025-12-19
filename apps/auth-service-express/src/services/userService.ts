import { BaseService } from '@loyalty/shared-utils';
import { users } from '@loyalty/shared-db';
import { z } from 'zod';

const userZ = z.object({
  roleId: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
});

export const userService = new BaseService(users as any, userZ);
