import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import dotenv from 'dotenv';
console.log('Connecting to DB:', process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export default db;
