"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
// src/services/BaseService.ts
const shared_db_1 = require("@loyalty/shared-db");
const drizzle_orm_1 = require("drizzle-orm");
// ------------------------------------------------------------------ //
// BaseService
// ------------------------------------------------------------------ //
class BaseService {
    constructor(table, schema) {
        this.table = table;
        this.schema = schema;
    }
    // --------------------------------------------------------------- //
    // Resolve executor (db or tx)
    // --------------------------------------------------------------- //
    exec(dbOrTx) {
        return dbOrTx !== null && dbOrTx !== void 0 ? dbOrTx : shared_db_1.db;
    }
    // --------------------------------------------------------------- //
    // CRUD
    // --------------------------------------------------------------- //
    create(data, dbOrTx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.schema)
                this.schema.parse(data);
            return this.exec(dbOrTx).insert(this.table).values(data).returning();
        });
    }
    findOne(where, dbOrTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const cond = typeof where === 'object' ? this.whereObj(where) : where;
            return this.exec(dbOrTx)
                .select()
                .from(this.table)
                .where(cond)
                .limit(1);
        });
    }
    update(where, updates, dbOrTx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.schema)
                this.schema.parse(updates);
            const cond = typeof where === 'object' ? this.whereObj(where) : where;
            return this.exec(dbOrTx)
                .update(this.table)
                .set(updates)
                .where(cond)
                .returning();
        });
    }
    delete(where, dbOrTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const cond = typeof where === 'object' ? this.whereObj(where) : where;
            return this.exec(dbOrTx).delete(this.table).where(cond).returning();
        });
    }
    // --------------------------------------------------------------- //
    // PAGINATION – rows + total + meta
    // --------------------------------------------------------------- //
    findManyPaginated(where_1) {
        return __awaiter(this, arguments, void 0, function* (where, opts = {}, dbOrTx) {
            const { page = 1, pageSize = 20, orderBy } = opts;
            const offset = (page - 1) * pageSize;
            const executor = this.exec(dbOrTx);
            const cond = where && typeof where === 'object'
                ? this.whereObj(where)
                : (where !== null && where !== void 0 ? where : undefined);
            // ---- rows ----------------------------------------------------
            let qb = executor.select().from(this.table);
            if (cond)
                qb = qb.where(cond);
            if (orderBy)
                qb = qb.orderBy(orderBy);
            qb = qb.limit(pageSize).offset(offset);
            // ---- count ---------------------------------------------------
            const countQb = executor
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(this.table)
                .where(cond !== null && cond !== void 0 ? cond : (0, drizzle_orm_1.sql) `true`);
            const [rows, [{ total }]] = yield Promise.all([qb, countQb]);
            const totalPages = Math.ceil(total / pageSize);
            return { rows, total, page, pageSize, totalPages };
        });
    }
    // --------------------------------------------------------------- //
    // Raw query builder – returns `any` (Drizzle 0.44)
    // --------------------------------------------------------------- //
    select(dbOrTx) {
        return this.exec(dbOrTx).select().from(this.table);
    }
    query(fn, dbOrTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const qb = fn(this.select(dbOrTx));
            return qb; // Builder is a promise in 0.44
        });
    }
    // --------------------------------------------------------------- //
    // Smart whereObj – object → SQL
    // --------------------------------------------------------------- //
    whereObj(obj) {
        if (!obj || Object.keys(obj).length === 0)
            return (0, drizzle_orm_1.sql) `true`;
        const conds = [];
        for (const [k, v] of Object.entries(obj)) {
            if (v === undefined || v === null)
                continue;
            const col = this.table[k];
            if (!col) {
                throw new Error(`Column "${k}" not found on table ${this.table._.name}`);
            }
            if (Array.isArray(v)) {
                conds.push((0, drizzle_orm_1.sql) `${col} = ANY(${v})`);
            }
            else if (v instanceof Date) {
                conds.push((0, drizzle_orm_1.sql) `${col} = ${v.toISOString()}`);
            }
            else if (typeof v === 'object' && 'from' in v && 'to' in v) {
                if (v.from)
                    conds.push((0, drizzle_orm_1.sql) `${col} >= ${v.from}`);
                if (v.to)
                    conds.push((0, drizzle_orm_1.sql) `${col} <= ${v.to}`);
            }
            else {
                conds.push((0, drizzle_orm_1.eq)(col, v));
            }
        }
        return conds.length ? (0, drizzle_orm_1.and)(...conds) : (0, drizzle_orm_1.sql) `true`;
    }
    // --------------------------------------------------------------- //
    // Transaction helpers – `any` for tx (Drizzle 0.44)
    // --------------------------------------------------------------- //
    static transaction(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            return shared_db_1.db.transaction(fn);
        });
    }
    withTx(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            return shared_db_1.db.transaction((tx) => fn(tx, this));
        });
    }
}
exports.BaseService = BaseService;
