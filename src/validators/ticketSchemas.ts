import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { tickets } from '../schema';
import { z } from 'zod';

const baseInsert = createInsertSchema(tickets) as any;
const baseSelect = createSelectSchema(tickets) as any;

export const insertTicketSchema = baseInsert.extend({
  typeId: z.number().int(),
  statusId: z.number().int(),
  subject: z.string().min(1),
  description: z.string().optional(),
});

export const updateTicketSchema = insertTicketSchema.partial();

export const selectTicketSchema = baseSelect;

export default { insertTicketSchema, updateTicketSchema, selectTicketSchema };
