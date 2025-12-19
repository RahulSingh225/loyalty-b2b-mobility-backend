import { z } from 'zod';
import { schema as dbSchema } from 'drizzle-zod';
import * as db from '../schema';

// generate zod validators from drizzle schema
export const zodSchemas = dbSchema(db as any);

export type ZodSchemas = typeof zodSchemas;
