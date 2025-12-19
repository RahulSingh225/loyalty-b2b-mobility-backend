import { db } from '@loyalty/shared-db';
import { Table, SQL, InferSelectModel } from 'drizzle-orm';
import { ZodType } from 'zod';
type DB = typeof db;
type Tx = any;
type DBOrTx = DB | Tx;
export interface PaginationOptions {
    page?: number;
    pageSize?: number;
    orderBy?: SQL;
}
export declare class BaseService<TTable extends Table<any>, TInsert = any, TUpdate = any> {
    readonly table: TTable;
    readonly schema?: ZodType<any> | undefined;
    constructor(table: TTable, schema?: ZodType<any> | undefined);
    private exec;
    create(data: TInsert, dbOrTx?: DBOrTx): Promise<any>;
    findOne(where: SQL | Record<string, any>, dbOrTx?: DBOrTx): Promise<any>;
    update(where: SQL | Record<string, any>, updates: TUpdate, dbOrTx?: DBOrTx): Promise<any>;
    delete(where: SQL | Record<string, any>, dbOrTx?: DBOrTx): Promise<any>;
    findManyPaginated(where?: SQL | Record<string, any>, opts?: PaginationOptions, dbOrTx?: DBOrTx): Promise<{
        rows: InferSelectModel<TTable>[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    protected select(dbOrTx?: DBOrTx): any;
    query<R>(fn: (qb: any) => any, dbOrTx?: DBOrTx): Promise<R[]>;
    protected whereObj(obj: Record<string, any>): SQL;
    static transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
    withTx<T>(fn: (tx: any, svc: this) => Promise<T>): Promise<T>;
}
export {};
