// src/services/BaseService.ts
import { db } from '@loyalty/shared-db';
import {
  Table,
  SQL,
  sql,
  eq,
  and,
  InferSelectModel,
  count,
  desc,
  asc,
} from 'drizzle-orm';
import { ZodType } from 'zod';

// ------------------------------------------------------------------ //
// Types
// ------------------------------------------------------------------ //
type DB = typeof db;
type Tx = any; // Drizzle 0.44: transaction is `any` (no public type)
type DBOrTx = DB | Tx;

// ------------------------------------------------------------------ //
// Pagination options
// ------------------------------------------------------------------ //
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: SQL;
}

// ------------------------------------------------------------------ //
// BaseService
// ------------------------------------------------------------------ //
export class BaseService<
  TTable extends Table<any>,
  TInsert = any,
  TUpdate = any
> {
  constructor(
    public readonly table: TTable,
    public readonly schema?: ZodType<any>
  ) { }

  // --------------------------------------------------------------- //
  // Resolve executor (db or tx)
  // --------------------------------------------------------------- //
  private exec(dbOrTx?: DBOrTx): any {
    return dbOrTx ?? db;
  }

  // --------------------------------------------------------------- //
  // CRUD
  // --------------------------------------------------------------- //
  async create(data: TInsert, dbOrTx?: DBOrTx) {
    if (this.schema) this.schema.parse(data);
    return this.exec(dbOrTx).insert(this.table).values(data).returning();
  }

  async findOne(where: SQL | Record<string, any>, dbOrTx?: DBOrTx) {
    const cond = typeof where === 'object' ? this.whereObj(where) : where;
    return this.exec(dbOrTx)
      .select()
      .from(this.table)
      .where(cond)
      .limit(1);
  }

  async update(
    where: SQL | Record<string, any>,
    updates: TUpdate,
    dbOrTx?: DBOrTx
  ) {
    if (this.schema) this.schema.parse(updates);
    const cond = typeof where === 'object' ? this.whereObj(where) : where;
    return this.exec(dbOrTx)
      .update(this.table)
      .set(updates)
      .where(cond)
      .returning();
  }

  async delete(where: SQL | Record<string, any>, dbOrTx?: DBOrTx) {
    const cond = typeof where === 'object' ? this.whereObj(where) : where;
    return this.exec(dbOrTx).delete(this.table).where(cond).returning();
  }

  // --------------------------------------------------------------- //
  // PAGINATION – rows + total + meta
  // --------------------------------------------------------------- //
  async findManyPaginated(
    where?: SQL | Record<string, any>,
    opts: PaginationOptions = {},
    dbOrTx?: DBOrTx
  ): Promise<{
    rows: InferSelectModel<TTable>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 20, orderBy } = opts;
    const offset = (page - 1) * pageSize;
    const executor = this.exec(dbOrTx);

    const cond =
      where && typeof where === 'object'
        ? this.whereObj(where)
        : (where ?? undefined);

    // ---- rows ----------------------------------------------------
    let qb: any = executor.select().from(this.table);
    if (cond) qb = qb.where(cond);
    if (orderBy) qb = qb.orderBy(orderBy);
    qb = qb.limit(pageSize).offset(offset);

    // ---- count ---------------------------------------------------
    const countQb: any = executor
      .select({ total: count() })
      .from(this.table)
      .where(cond ?? sql`true`);

    const [rows, [{ total }]] = await Promise.all([qb, countQb]);

    const totalPages = Math.ceil(total / pageSize);
    return { rows, total, page, pageSize, totalPages };
  }

  // --------------------------------------------------------------- //
  // Raw query builder – returns `any` (Drizzle 0.44)
  // --------------------------------------------------------------- //
  protected select(dbOrTx?: DBOrTx): any {
    return this.exec(dbOrTx).select().from(this.table);
  }

  async query<R>(
    fn: (qb: any) => any,
    dbOrTx?: DBOrTx
  ): Promise<R[]> {
    const qb = fn(this.select(dbOrTx));
    return qb; // Builder is a promise in 0.44
  }

  // --------------------------------------------------------------- //
  // Smart whereObj – object → SQL
  // --------------------------------------------------------------- //
  protected whereObj(obj: Record<string, any>): SQL {
    if (!obj || Object.keys(obj).length === 0) return sql`true`;

    const conds: SQL[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;

      const col = (this.table as any)[k];
      if (!col) {
        throw new Error(`Column "${k}" not found on table ${this.table._.name}`);
      }

      if (Array.isArray(v)) {
        conds.push(sql`${col} = ANY(${v})`);
      } else if (v instanceof Date) {
        conds.push(sql`${col} = ${v.toISOString()}`);
      } else if (typeof v === 'object' && 'from' in v && 'to' in v) {
        if (v.from) conds.push(sql`${col} >= ${v.from}`);
        if (v.to) conds.push(sql`${col} <= ${v.to}`);
      } else {
        conds.push(eq(col, v));
      }
    }

    return conds.length ? and(...conds)! : sql`true`;
  }

  // --------------------------------------------------------------- //
  // Transaction helpers – `any` for tx (Drizzle 0.44)
  // --------------------------------------------------------------- //
  static async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return db.transaction(fn);
  }

  async withTx<T>(fn: (tx: any, svc: this) => Promise<T>): Promise<T> {
    return db.transaction((tx) => fn(tx, this));
  }
}