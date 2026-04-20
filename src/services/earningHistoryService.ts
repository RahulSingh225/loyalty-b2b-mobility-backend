import { BaseService } from './baseService';
import db from '../config/db';
import {
  counterSalesLedger,
  counterSalesTransactionLogs,
  electricianLedger,
  electricianTransactionLogs,
  retailerLedger,
  retailerTransactionLogs,
  users,
  userTypeEntity
} from '../schema';
import { desc, eq, sql, and, gte, lte } from 'drizzle-orm';
import { PaginationOptions } from './baseService';

interface EarningHistoryOptions extends PaginationOptions {
  fromDate?: string;
  toDate?: string;
  status?: string;
}

class EarningHistoryService {
  private async getUserRoleName(userId: number): Promise<string | null> {
    const userServer = new BaseService(users as any);
    const [userWithRole] = await userServer.query<any>((qb) =>
      qb
        .select({
          roleName: userTypeEntity.typeName,
        })
        .from(users)
        .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
        .where(eq(users.id, userId))
    );
    return userWithRole ? userWithRole.roleName : null;
  }

  private toIST(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const safeStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const date = new Date(safeStr);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = date.getTime() + istOffset;
    return new Date(istTime).toISOString().replace('T', ' ').substring(0, 19);
  }

  async getEarningHistory(userId: number, opts: EarningHistoryOptions = {}) {
    const roleName = await this.getUserRoleName(userId);
    if (!roleName) throw new Error('User role not found');

    if (roleName === 'Electrician') {
      return this.getElectricianEarningHistory(userId, opts);
    } else if (roleName === 'Retailer') {
      return this.getRetailerEarningHistory(userId, opts);
    } else if (roleName === 'CounterSales' || roleName === 'Counter Staff') {
      return this.getCounterSalesEarningHistory(userId, opts);
    }

    return { rows: [], total: 0, page: 1, pageSize: opts.pageSize || 20, totalPages: 0 };
  }

  async getCounterSalesEarningHistory(userId: number, opts: EarningHistoryOptions = {}) {
    const service = new BaseService(counterSalesTransactionLogs as any);
    const { page = 1, pageSize = 20, fromDate, toDate } = opts;

    // Build date filter conditions
    const conditions: any[] = [eq(counterSalesTransactionLogs.userId, userId)];

    if (fromDate) {
      conditions.push(gte(counterSalesTransactionLogs.createdAt, new Date(fromDate).toISOString()));
    }
    if (toDate) {
      // Add one day to include the entire toDate day
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(counterSalesTransactionLogs.createdAt, endDate.toISOString()));
    }
    if (opts.status) {
      conditions.push(eq(counterSalesTransactionLogs.status, opts.status.toUpperCase()));
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    const result = await service.query((db) =>
      db.select()
        .from(counterSalesTransactionLogs)
        .where(whereCondition)
        .orderBy(desc(counterSalesTransactionLogs.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize)
    );

    const countResult = await service.query((db) =>
      db.select({ count: sql<number>`count(*)` })
        .from(counterSalesTransactionLogs)
        .where(whereCondition)
    );

    const total = Number((countResult[0] as any)?.count || 0);
    const totalPages = Math.ceil(total / pageSize);

    const rows = result.map((r: any) => ({ ...r, createdAt: this.toIST(r.createdAt) }));
    return { rows, total, page, pageSize, totalPages };
  }

  async getElectricianEarningHistory(userId: number, opts: EarningHistoryOptions = {}) {
    const service = new BaseService(electricianTransactionLogs as any);
    const { page = 1, pageSize = 20, fromDate, toDate } = opts;

    // Build date filter conditions
    const conditions: any[] = [eq(electricianTransactionLogs.userId, userId)];

    if (fromDate) {
      conditions.push(gte(electricianTransactionLogs.createdAt, new Date(fromDate).toISOString()));
    }
    if (toDate) {
      // Add one day to include the entire toDate day
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(electricianTransactionLogs.createdAt, endDate.toISOString()));
    }
    if (opts.status) {
      conditions.push(eq(electricianTransactionLogs.status, opts.status.toUpperCase()));
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    const result = await service.query((db) =>
      db.select()
        .from(electricianTransactionLogs)
        .where(whereCondition)
        .orderBy(desc(electricianTransactionLogs.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize)
    );

    const countResult = await service.query((db) =>
      db.select({ count: sql<number>`count(*)` })
        .from(electricianTransactionLogs)
        .where(whereCondition)
    );

    const total = Number((countResult[0] as any)?.count || 0);
    const totalPages = Math.ceil(total / pageSize);

    const rows = result.map((r: any) => ({ ...r, createdAt: this.toIST(r.createdAt) }));
    return { rows, total, page, pageSize, totalPages };
  }

  async getRetailerEarningHistory(userId: number, opts: EarningHistoryOptions = {}) {
    const service = new BaseService(retailerTransactionLogs as any);
    const { page = 1, pageSize = 20, fromDate, toDate } = opts;

    // Build date filter conditions
    const conditions: any[] = [eq(retailerTransactionLogs.userId, userId)];

    if (fromDate) {
      conditions.push(gte(retailerTransactionLogs.createdAt, new Date(fromDate).toISOString()));
    }
    if (toDate) {
      // Add one day to include the entire toDate day
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(retailerTransactionLogs.createdAt, endDate.toISOString()));
    }
    if (opts.status) {
      conditions.push(eq(retailerTransactionLogs.status, opts.status.toUpperCase()));
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    const result = await service.query((db) =>
      db.select()
        .from(retailerTransactionLogs)
        .where(whereCondition)
        .orderBy(desc(retailerTransactionLogs.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize)
    );

    const countResult = await service.query((db) =>
      db.select({ count: sql<number>`count(*)` })
        .from(retailerTransactionLogs)
        .where(whereCondition)
    );

    const total = Number((countResult[0] as any)?.count || 0);
    const totalPages = Math.ceil(total / pageSize);

    const rows = result.map((r: any) => ({ ...r, createdAt: this.toIST(r.createdAt) }));
    return { rows, total, page, pageSize, totalPages };
  }

  async getEarningDetail(transactionId: number, userId: number) {
    const roleName = await this.getUserRoleName(userId);
    if (!roleName) throw new Error('User role not found');

    let table;
    if (roleName === 'Electrician') {
      table = electricianTransactionLogs;
    } else if (roleName === 'Retailer') {
      table = retailerTransactionLogs;
    } else if (roleName === 'CounterSales' || roleName === 'Counter Staff') {
      table = counterSalesTransactionLogs;
    }

    if (!table) return null;

    const service = new BaseService(table as any);
    const [record] = await service.findOne({ id: transactionId, userId });
    if (record) {
      record.createdAt = this.toIST(record.createdAt);
    }
    return record;
  }

  async getPassbook(userId: number) {
    const roleName = await this.getUserRoleName(userId);

    let targetTable;
    if (roleName === 'Retailer') {
      targetTable = retailerLedger;
    } else if (roleName === 'Electrician') {
      targetTable = electricianLedger;
    } else if (roleName === 'CounterSales' || roleName === 'Counter Staff') {
      targetTable = counterSalesLedger;
    }

    if (!targetTable) return null;
    const targetService = new BaseService(targetTable as any);

    const totalsPromise = targetService.query<any>((db) =>
      db.select({
        totalCredits: sql`COALESCE(SUM(CASE WHEN ${(targetTable as any).type} = 'CREDIT' THEN ${(targetTable as any).amount} ELSE 0 END), 0)`,
        totalDebits: sql`COALESCE(SUM(CASE WHEN ${(targetTable as any).type} = 'DEBIT' THEN ${(targetTable as any).amount} ELSE 0 END), 0)`,
      })
        .from(targetTable as any)
        .where(eq((targetTable as any).userId, userId))
    );

    const monthlyPromise = targetService.query<any>((db) =>
      db.select({
        month: sql`to_char(date_trunc('month', ${(targetTable as any).createdAt}), 'YYYY-MM')`,
        credits: sql`COALESCE(SUM(CASE WHEN ${(targetTable as any).type} = 'CREDIT' THEN ${(targetTable as any).amount} ELSE 0 END), 0)`,
        debits: sql`COALESCE(SUM(CASE WHEN ${(targetTable as any).type} = 'DEBIT' THEN ${(targetTable as any).amount} ELSE 0 END), 0)`,
      })
        .from(targetTable as any)
        .where(eq((targetTable as any).userId, userId))
        .groupBy(sql`date_trunc('month', ${(targetTable as any).createdAt})`)
        .orderBy(sql`date_trunc('month', ${(targetTable as any).createdAt})`)
    );

    const [totalsRes, monthlyRes] = await Promise.all([totalsPromise, monthlyPromise]);
    const totals = totalsRes[0] ?? { totalCredits: 0, totalDebits: 0 };

    // Normalize numeric types (Postgres numeric may come back as string)
    const parseNumber = (v: any) => (v === null || v === undefined ? 0 : Number(v));

    return {
      totalCredits: parseNumber(totals.totalCredits),
      totalDebits: parseNumber(totals.totalDebits),
      monthly: (monthlyRes || []).map((r: any) => ({
        month: r.month,
        credits: parseNumber(r.credits),
        debits: parseNumber(r.debits),
      })),
    };
  }

  async getLedgerHistory(userId: number, opts: EarningHistoryOptions = {}) {
    const roleName = await this.getUserRoleName(userId);
    let targetTable: any;
    if (roleName === 'Retailer') targetTable = retailerLedger;
    else if (roleName === 'Electrician') targetTable = electricianLedger;
    else if (roleName === 'CounterSales' || roleName === 'Counter Staff') targetTable = counterSalesLedger;

    if (!targetTable) throw new Error('Ledger not found for user');

    const { page = 1, pageSize = 20, fromDate, toDate } = opts;
    const conditions: any[] = [eq(targetTable.userId, userId)];

    if (fromDate) conditions.push(gte(targetTable.createdAt, new Date(fromDate).toISOString()));
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(targetTable.createdAt, endDate.toISOString()));
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    const result = await db.select().from(targetTable)
      .where(whereCondition)
      .orderBy(desc(targetTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(targetTable)
      .where(whereCondition);

    const total = Number(countResult[0]?.count || 0);
    const rows = result.map((r: any) => ({ ...r, createdAt: this.toIST(r.createdAt) }));

    return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), rows };
  }
}

export const earningHistoryService = new EarningHistoryService();
