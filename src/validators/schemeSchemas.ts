import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { schemes } from '../schema';
import { z } from 'zod';

const baseInsert = createInsertSchema(schemes) as any;
const baseSelect = createSelectSchema(schemes) as any;

export const insertSchemeSchema = baseInsert.extend({
  name: z.string().min(1),
  startDate: z.string().refine((s) => !isNaN(Date.parse(s)), { message: 'Invalid startDate' }),
  endDate: z.string().refine((s) => !isNaN(Date.parse(s)), { message: 'Invalid endDate' }),
});

export const updateSchemeSchema = insertSchemeSchema.partial();

export const selectSchemeSchema = baseSelect;

export default { insertSchemeSchema, updateSchemeSchema, selectSchemeSchema };
