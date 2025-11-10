import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { retailers } from '../schema';
import { z } from 'zod';

const baseInsert = createInsertSchema(retailers) as any;
const baseSelect = createSelectSchema(retailers) as any;

export const insertRetailerSchema = baseInsert.extend({
  name: z.string().min(1, { message: 'Retailer name is required' }),
  phone: z.string().regex(/^\+?\d{7,15}$/, { message: 'Phone must be 7–15 digits and may include +country code' }).optional(),
  email: z.string().email({ message: 'Provide a valid email address' }).optional(),
  aadhaar: z.string().regex(/^\d{12}$/, { message: 'AADHAAR must be a 12 digit number' }).optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'PAN must be in format ABCDE1234F' }).optional(),
  gst: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, { message: 'GSTIN appears invalid' }).optional(),
  onboardingTypeId: z.number().int().optional(),
});

export const updateRetailerSchema = insertRetailerSchema.partial();

export const selectRetailerSchema = baseSelect.extend({
  phone: z.string().regex(/^\+?\d{7,15}$/, 'Invalid phone number').optional(),
});

export default { insertRetailerSchema, updateRetailerSchema, selectRetailerSchema };
