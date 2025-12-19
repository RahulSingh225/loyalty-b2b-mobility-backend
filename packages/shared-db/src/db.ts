import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

// Ensure DATABASE_URL is present
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    // In a shared lib, we might not want to throw immediately on import if not used, 
    // but for now let's keep it strict or allow lazy connection.
    // console.warn("DATABASE_URL not set for shared-db");
}

const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
export * from 'drizzle-orm'; 
