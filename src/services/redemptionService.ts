import { BaseService } from './baseService';
import { redemptions } from '../schema';
import { desc, eq, sql, gte, lte, and, inArray } from 'drizzle-orm';
import { PaginationOptions } from './baseService';
import { db } from '../config/db';
import {
  redemptionBankTransfers,
  redemptionUpi,
  redemptionVouchers,
  thirdPartyApiLogs,
  amazonOrderItems,
  redemptionChannels,
  redemptionStatuses,
} from '../schema';


import {
  NewRedemptionBankTransfer,
  NewRedemptionUpi,
  NewThirdPartyApiLog
} from '../schema/type'

import {
  retailers,
  electricians,
  counterSales,
  retailerLedger,
  electricianLedger,
  counterSalesLedger,
  users,
  userTypeEntity
} from '../schema';

interface RedemptionHistoryOptions extends PaginationOptions {
  fromDate?: string;
  toDate?: string;
  status?: string;
}

class RedemptionService extends BaseService<typeof redemptions> {
  private toIST(dateInput: string | Date | null): string | null {
    if (!dateInput) return null;
    let date: Date;
    if (typeof dateInput === 'string') {
      const safeStr = dateInput.endsWith('Z') ? dateInput : dateInput + 'Z';
      date = new Date(safeStr);
    } else {
      date = new Date(dateInput);
    }

    // Handle invalid dates
    if (isNaN(date.getTime())) return null;

    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = date.getTime() + istOffset;
    return new Date(istTime).toISOString().replace('T', ' ').substring(0, 19);
  }

  async getRedemptionHistory(userId: number, opts: RedemptionHistoryOptions = {}) {
    const { page = 1, pageSize = 20, fromDate, toDate, status } = opts;
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [eq(redemptions.userId, userId)];

    if (fromDate) {
      conditions.push(gte(redemptions.createdAt, new Date(fromDate).toISOString()));
    }
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(redemptions.createdAt, endDate.toISOString()));
    }
    if (status) {
      const lowerStatus = status.toLowerCase();
      if (['pending', 'delivered', 'cancelled'].includes(lowerStatus)) {
        let statusNames: string[] = [];
        if (lowerStatus === 'pending') {
          statusNames = ['Pending', 'Requested', 'Processing', 'In Progress', 'Under Review', 'PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'];
        } else if (lowerStatus === 'delivered') {
          statusNames = ['Delivered', 'Approved', 'Completed', 'COMPLETED', 'REDEEMED', 'Delivered'];
        } else if (lowerStatus === 'cancelled') {
          statusNames = ['Cancelled', 'Rejected', 'Failed', 'CANCELLED', 'REJECTED', 'FAILED'];
        }

        const subResult = await db.select({ id: redemptionStatuses.id })
          .from(redemptionStatuses)
          .where(sql`LOWER(${redemptionStatuses.name}) IN ${statusNames.map(s => s.toLowerCase())}`);

        if (subResult.length > 0) {
          conditions.push(inArray(redemptions.status, subResult.map(s => s.id)));
          console.log(`Mapped status "${status}" to IDs:`, subResult.map(s => s.id));
        } else {
          // Fallback static IDs if DB is empty or misconfigured
          if (lowerStatus === 'pending') conditions.push(inArray(redemptions.status, [1, 6]));
          if (lowerStatus === 'delivered') conditions.push(inArray(redemptions.status, [2, 5]));
          if (lowerStatus === 'cancelled') conditions.push(inArray(redemptions.status, [3, 4]));
        }
      } else if (!isNaN(Number(status))) {
        conditions.push(eq(redemptions.status, Number(status)));
      }
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Build query with joins for all redemption channels
    const query = db
      .select({
        redemption: redemptions,
        channel: redemptionChannels,
        status: redemptionStatuses,
        amazonItem: amazonOrderItems,
        voucher: redemptionVouchers,
        bankTransfer: redemptionBankTransfers,
        upi: redemptionUpi,
      })
      .from(redemptions)
      .leftJoin(redemptionChannels, eq(redemptions.channelId, redemptionChannels.id))
      .leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id))
      .leftJoin(
        amazonOrderItems,
        and(
          eq(redemptions.channelId, 4), // Amazon Market Place
          sql`${redemptions.channelReferenceId}::int = ${amazonOrderItems.orderItemId}`
        )
      )
      .leftJoin(
        redemptionVouchers,
        and(
          eq(redemptions.channelId, 3), // EVoucher
          eq(redemptions.id, redemptionVouchers.redemptionId)
        )
      )
      .leftJoin(
        redemptionBankTransfers,
        and(
          eq(redemptions.channelId, 2), // Bank Transfer
          eq(redemptions.id, redemptionBankTransfers.redemptionId)
        )
      )
      .leftJoin(
        redemptionUpi,
        and(
          eq(redemptions.channelId, 1), // UPI
          eq(redemptions.id, redemptionUpi.redemptionId)
        )
      )
      .where(whereCondition)
      .orderBy(desc(redemptions.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(redemptions)
      .where(whereCondition);

    const [rows, countResult] = await Promise.all([query, countQuery]);
    const total = Number(countResult[0].count);

    const formattedRows = rows.map((r: any) => {
      // Build a unified metadata object or direct fields for the frontend
      const base = {
        ...r.redemption,
        channelName: r.channel?.name,
        statusName: r.status?.name,
        createdAt: this.toIST(r.redemption.createdAt),
        updatedAt: this.toIST(r.redemption.updatedAt),
      };

      // Enrich with channel-specific data
      if (r.amazonItem) {
        base.amazonItem = r.amazonItem;
      } else if (r.voucher) {
        base.voucher = r.voucher;
      } else if (r.bankTransfer) {
        base.bankTransfer = r.bankTransfer;
      } else if (r.upi) {
        base.upi = r.upi;
      }

      return base;
    });

    return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), rows: formattedRows };
  }

  async getRedemptionHistoryByStatus(userId: number, status: number, opts: PaginationOptions = {}) {
    const { page = 1, pageSize = 20 } = opts;
    const result = await this.findManyPaginated(
      { userId, status },
      { page, pageSize, orderBy: desc(redemptions.createdAt) }
    );
    const rows = result.rows.map((r: any) => ({
      ...r,
      createdAt: this.toIST(r.createdAt),
      updatedAt: this.toIST(r.updatedAt)
    }));
    return { ...result, rows };
  }

  async getRedemptionDetail(redemptionId: number) {
    const [redemption] = await this.findOne({ id: redemptionId });
    if (redemption) {
      (redemption as any).createdAt = this.toIST((redemption as any).createdAt);
      (redemption as any).updatedAt = this.toIST((redemption as any).updatedAt);
    }
    return redemption;
  }

  async getUserRedemptionStats(userId: number) {
    const all = await this.findManyPaginated({ userId }, { pageSize: 1 });
    const totalRedemptions = all?.total || 0;

    // Get total points redeemed (sum)
    const result = await this.query<{ totalPoints: string | null; totalAmount: string | null }>((qb) =>
      qb
        .select({
          totalPoints: sql`sum(${redemptions.pointsRedeemed})`,
          totalAmount: sql`sum(${redemptions.amount})`,
        })
        .from(redemptions)
        .where(eq(redemptions.userId, userId))
    );

    return {
      totalRedemptions,
      totalPointsRedeemed: Number(result[0]?.totalPoints || 0),
      totalAmountRedeemed: Number(result[0]?.totalAmount || 0),
    };
  }

  // ============================================================================
  // Razorpay-Specific Methods
  // ============================================================================

  /**
   * Create bank transfer record
   */
  async createBankTransferRecord(data: NewRedemptionBankTransfer, tx?: any) {
    const [record] = await (tx || db).insert(redemptionBankTransfers).values(data).returning();
    return record;
  }

  /**
   * Create UPI record
   */
  async createUpiRecord(data: NewRedemptionUpi, tx?: any) {
    const [record] = await (tx || db).insert(redemptionUpi).values(data).returning();
    return record;
  }

  /**
   * Update channel reference ID
   */
  async updateChannelReferenceId(redemptionId: number, channelReferenceId: number, tx?: any) {
    await (tx || db).update(redemptions)
      .set({ channelReferenceId })
      .where(eq(redemptions.id, redemptionId));
  }

  /**
   * Update bank transfer with Razorpay payout data
   */
  async updateBankTransferPayout(redemptionId: number, data: {
    razorpayPayoutId?: string;
    razorpayFundAccountId?: string;
    razorpayContactId?: string;
    utr?: string;
    processedAt?: string;
  }, tx?: any) {
    await (tx || db).update(redemptionBankTransfers)
      .set(data)
      .where(eq(redemptionBankTransfers.redemptionId, redemptionId));
  }

  /**
   * Update UPI with Razorpay payout data
   */
  async updateUpiPayout(redemptionId: number, data: {
    razorpayPayoutId?: string;
    razorpayFundAccountId?: string;
    razorpayContactId?: string;
    utr?: string;
    processedAt?: string;
  }, tx?: any) {
    await (tx || db).update(redemptionUpi)
      .set(data)
      .where(eq(redemptionUpi.redemptionId, redemptionId));
  }

  /**
   * Update redemption status
   */
  async updateRedemptionStatus(redemptionId: number, statusId: number, metadata?: any) {
    await db.update(redemptions)
      .set({
        status: statusId,
        ...(metadata && { metadata }),
        updatedAt: new Date().toISOString()
      })
      .where(eq(redemptions.id, redemptionId));
  }

  /**
   * Refund points to user balance
   */
  async refundPoints(redemptionId: number, userId: number, points: number, reason: string) {
    // Get user role
    const [userWithRole] = await db
      .select({ roleName: userTypeEntity.typeName })
      .from(users)
      .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
      .where(eq(users.id, userId));

    if (!userWithRole) {
      throw new Error('User not found for refund');
    }

    // Determine target table
    let targetTable: typeof retailers | typeof electricians | typeof counterSales;
    let ledgerTable: typeof retailerLedger | typeof electricianLedger | typeof counterSalesLedger;
    let userIdCol: any;

    if (userWithRole.roleName === 'Retailer') {
      targetTable = retailers;
      ledgerTable = retailerLedger;
      userIdCol = retailers.userId;
    } else if (userWithRole.roleName === 'Electrician') {
      targetTable = electricians;
      ledgerTable = electricianLedger;
      userIdCol = electricians.userId;
    } else if (userWithRole.roleName === 'CounterSales' || userWithRole.roleName === 'Counter Staff') {
      targetTable = counterSales;
      ledgerTable = counterSalesLedger;
      userIdCol = counterSales.userId;
    } else {
      throw new Error('User role cannot receive refund');
    }

    // Get current balance
    const [profile] = await db
      .select({ bal: targetTable.pointsBalance })
      .from(targetTable)
      .where(eq(userIdCol, userId));

    const openingBalance = Number(profile?.bal || 0);
    const closingBalance = openingBalance + points;

    // Refund points
    await db.update(targetTable).set({
      pointsBalance: sql`points_balance + ${points}`,
      totalBalance: sql`total_balance + ${points}`,
      totalRedeemed: sql`total_redeemed - ${points}`
    }).where(eq(userIdCol, userId));

    // Create ledger entry
    await db.insert(ledgerTable).values({
      userId,
      earningType: 0,
      amount: String(points),
      redemptionType: 0,
      type: 'CREDIT',
      openingBalance: String(openingBalance),
      closingBalance: String(closingBalance),
      remarks: `Refund: ${reason}`,
    });

    return { refunded: points, newBalance: closingBalance };
  }

  /**
   * Get voucher details by platform order ID
   */
  async getVoucherDetailsByPlatformOrderId(platformOrderId: string) {
    const results = await db
      .select({
        refId: redemptions.redemptionId,
        orderId: redemptionVouchers.platformOrderId,
        txnId: redemptionVouchers.txnId,
        voucherName: redemptionVouchers.voucherName,
        rate: redemptionVouchers.rate,
        qty: redemptionVouchers.qty,
        status: redemptionVouchers.status,
        txnTime: redemptionVouchers.txnTime,
      })
      .from(redemptionVouchers)
      .innerJoin(redemptions, eq(redemptionVouchers.redemptionId, redemptions.id))
      .where(eq(redemptionVouchers.platformOrderId, platformOrderId));

    return results;
  }

  /**
   * Update individual voucher status
   */
  async updateVoucherStatus(voucherId: number, status: string, tx?: any) {
    await (tx || db).update(redemptionVouchers)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(redemptionVouchers.id, voucherId));
  }

  /**
   * Refund points for a specific voucher
   */
  async refundVoucherPoints(redemptionId: number, points: number, reason: string) {
    // 1. Get redemption and user details
    const [redemption] = await db
      .select({ userId: redemptions.userId })
      .from(redemptions)
      .where(eq(redemptions.id, redemptionId));

    if (!redemption) throw new Error('Redemption not found for voucher refund');

    // 2. Reuse standard refund logic for points reversal
    return await this.refundPoints(redemptionId, redemption.userId, points, reason);
  }
}

export const redemptionService = new RedemptionService(redemptions as any);
