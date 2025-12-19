import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { redemptions } from '../schema';
import { z } from 'zod';

const baseInsert = createInsertSchema(redemptions) as any;
const baseSelect = createSelectSchema(redemptions) as any;

export const insertRedemptionSchema = baseInsert.extend({
  redemptionId: z.string().min(1),
  channelId: z.number().int(),
  pointsRedeemed: z.number().int(),
  status: z.number().int(),
});

export const updateRedemptionSchema = insertRedemptionSchema.partial();

export const selectRedemptionSchema = baseSelect;

export default { insertRedemptionSchema, updateRedemptionSchema, selectRedemptionSchema };
