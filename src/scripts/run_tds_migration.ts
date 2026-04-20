import { db } from '../config/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function run() {
    try {
        const sqlPath = path.join(process.cwd(), 'drizzle', 'migration_tds.sql');
        console.log(`Reading SQL from ${sqlPath}`);
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

        console.log('Executing migration...');
        await db.execute(sql.raw(sqlContent));
        console.log('Migration executed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
