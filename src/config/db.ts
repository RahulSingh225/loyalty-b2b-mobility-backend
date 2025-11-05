import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g. postgres://user:pass@host:port/db
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
});

// Initialize drizzle instance
export const db = drizzle(pool, { logger:false,schema });
