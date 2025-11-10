import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { electricians } from '../schema';
import { z } from 'zod';

const baseInsert = createInsertSchema(electricians) as any;
const baseSelect = createSelectSchema(electricians) as any;

export const insertElectricianSchema = baseInsert.extend({
  name: z.string().min(1, { message: 'Name is required and cannot be empty' }),
  phone: z.string().regex(/^\+?\d{7,15}$/, { message: 'Phone must be 7–15 digits, optional leading + and country code' }).optional(),
  email: z.string().email({ message: 'Please provide a valid email address' }).optional(),
  aadhaar: z.string().regex(/^\d{12}$/, { message: 'AADHAAR must be a 12 digit number' }).optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'PAN must be in the format ABCDE1234F' }).optional(),
  gst: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, { message: 'GSTIN appears invalid' }).optional(),
  onboardingTypeId: z.number().int().optional().describe('Onboarding type id must be integer'),
});

export const updateElectricianSchema = insertElectricianSchema.partial();

export const selectElectricianSchema = baseSelect;

export default { insertElectricianSchema, updateElectricianSchema, selectElectricianSchema };
