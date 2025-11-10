import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { counterSales } from '../schema';
import { z } from 'zod';

const baseInsert = createInsertSchema(counterSales) as any;
const baseSelect = createSelectSchema(counterSales) as any;

export const insertCounterSalesSchema = baseInsert.extend({
  name: z.string().min(1, { message: 'Name is required for counter sales' }),
  phone: z.string().regex(/^\+?\d{7,15}$/, { message: 'Phone must be 7–15 digits, include country code optionally' }),
  aadhaar: z.string().regex(/^\d{12}$/, { message: 'AADHAAR must be a 12 digit number' }).optional(),
  onboardingTypeId: z.number().int().optional().describe('onboarding type id must be integer'),
});

export const updateCounterSalesSchema = insertCounterSalesSchema.partial();

export const selectCounterSalesSchema = baseSelect;

export default { insertCounterSalesSchema, updateCounterSalesSchema, selectCounterSalesSchema };
