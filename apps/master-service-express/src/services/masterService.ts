import { db } from '@loyalty/shared-db';
import * as schema from '@loyalty/shared-db';
import { eq, sql } from 'drizzle-orm';

// Helper to get table object by string name
const getTable = (tableName: string) => {
    const table = (schema as any)[tableName];
    if (!table) throw new Error(`Table ${tableName} not found in schema`);
    return table;
};

export const listMasters = async (tableName: string) => {
    const table = getTable(tableName);
    // Default limit 50 for safety
    return db.select().from(table).limit(50);
};

export const getMaster = async (tableName: string, id: number) => {
    const table = getTable(tableName);
    const result = await db.select().from(table).where(eq(table.id, id));
    return result[0];
};

export const createMaster = async (tableName: string, data: any) => {
    const table = getTable(tableName);
    const result = await db.insert(table).values(data).returning();
    return (result as any[])[0];
};

export const updateMaster = async (tableName: string, id: number, data: any) => {
    const table = getTable(tableName);
    const result = await db.update(table).set(data).where(eq(table.id, id)).returning();
    return (result as any[])[0];
};

export const deleteMaster = async (tableName: string, id: number) => {
    const table = getTable(tableName);
    const result = await db.delete(table).where(eq(table.id, id)).returning();
    return (result as any[])[0];
};
