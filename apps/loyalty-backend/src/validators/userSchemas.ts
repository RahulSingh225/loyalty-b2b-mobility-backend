import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../schema';
import { z } from 'zod';

// create base schemas using drizzle-zod then extend/refine with zod
const baseInsert = createInsertSchema(users) as any;
const baseSelect = createSelectSchema(users) as any;

export const insertUserSchema = baseInsert.extend({
  name: z.string().min(1, { message: 'Name is required when creating a user' }),
  phone: z.string().regex(/^\+?\d{10,15}$/, { message: 'Enter a valid phone number (10–15 digits)' }),
  email: z.string().email({ message: 'Please provide a valid email address' }).optional(),
});

export const selectUserSchema = baseSelect.extend({
  name: z.string().optional(),
  phone: z.string().regex(/^\+?\d{10,15}$/, { message: 'Invalid phone format' }).optional(),
});

export const updateUserSchema = insertUserSchema.partial().refine(
  (data) => {
    if ((data as any).phone && !/^\+?\d{10,15}$/.test((data as any).phone)) return false;
    return true;
  },
  { message: 'Invalid phone number', path: ['phone'] }
);

export default { insertUserSchema, selectUserSchema, updateUserSchema };
