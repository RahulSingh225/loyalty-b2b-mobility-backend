import db from '../config/db';
import {  AnyTable } from 'drizzle-orm';
import { ZodType } from 'zod';

export class BaseService<TTable extends AnyTable<any>, TInsert = any, TUpdate = any> {
  constructor(public table: TTable, public schema?: ZodType<any>) {}

  async create(data: TInsert) {
    if (this.schema) this.schema.parse(data);
    const res = await db.insert(this.table as any).values(data as any).returning();
    return res;
  }

  async findOne(where: any) {
    return db.select().from(this.table as any).where(where).limit(1);
  }

  async findMany(where?: any) {
    const q = db.select().from(this.table as any);
    if (where) q.where(where as any);
    return q.execute();
  }

  async update(where: any, updates: TUpdate) {
    if (this.schema) this.schema.parse(updates);
    return db.update(this.table as any).set(updates as any).where(where as any).returning();
  }

  async delete(where: any) {
    return db.delete(this.table as any).where(where as any).returning();
  }
}
