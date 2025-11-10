import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { retailerTransactions } from '../schema';
import { z } from 'zod';

const baseInsert = createInsertSchema(retailerTransactions) as any;
const baseSelect = createSelectSchema(retailerTransactions) as any;

export const insertRetailerTransactionSchema = baseInsert.extend({
  userId: z.number().int(),
  earningType: z.number().int(),
  points: z.number(),
  category: z.string().min(1),
});

export const updateRetailerTransactionSchema = insertRetailerTransactionSchema.partial();

export const selectRetailerTransactionSchema = baseSelect;

export default { insertRetailerTransactionSchema, updateRetailerTransactionSchema, selectRetailerTransactionSchema };
