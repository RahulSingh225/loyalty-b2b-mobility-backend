import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { creatives } from '../schema';
import { z } from 'zod';

const baseInsert = createInsertSchema(creatives) as any;
const baseSelect = createSelectSchema(creatives) as any;

export const insertCreativeSchema = baseInsert.extend({
  typeId: z.number().int(),
  url: z.string().url(),
  title: z.string().min(1),
});

export const updateCreativeSchema = insertCreativeSchema.partial();

export const selectCreativeSchema = baseSelect;

export default { insertCreativeSchema, updateCreativeSchema, selectCreativeSchema };
