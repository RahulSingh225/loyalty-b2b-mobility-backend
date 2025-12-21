// src/services/EarningCreditService.ts

import { eq, sql } from 'drizzle-orm';
import {
  users,
  retailerTransactions,
  retailerTransactionLogs,
  retailerLedger,
  retailers,
  electricianTransactions,
  electricianTransactionLogs,
  electricianLedger,
  electricians,
  counterSalesTransactions,
  counterSalesTransactionLogs,
  counterSalesLedger,
  counterSales,
  earningTypes,
} from '../schema';
import { TdsModule } from '../procedures/TdsModule'; // assuming path
import { AppError } from '../middlewares/errorHandler';

type UserType = 'Retailer' | 'Electrician' | 'Counter Staff';

interface CreditOptions {
  category?: string;
  qrCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, any>;
  remarks?: string;
  earningTypeName: string; // e.g., 'QR Scan', 'QR Scan - Indirect', 'Referral Bonus'
  schemeId?: number | null;
}

export class EarningCreditService {
  private static getTables(userType: UserType) {
    switch (userType) {
      case 'Retailer':
        return {
          txnTable: retailerTransactions,
          logTable: retailerTransactionLogs,
          ledgerTable: retailerLedger,
          profileTable: retailers,
        };
      case 'Electrician':
        return {
          txnTable: electricianTransactions,
          logTable: electricianTransactionLogs,
          ledgerTable: electricianLedger,
          profileTable: electricians,
        };
      case 'Counter Staff':
        return {
          txnTable: counterSalesTransactions,
          logTable: counterSalesTransactionLogs,
          ledgerTable: counterSalesLedger,
          profileTable: counterSales,
        };
      default:
        throw new AppError(`Unsupported user type: ${userType}`, 500);
    }
  }

  /**
   * Credits points to a user with full audit trail (txn, log, balance, ledger)
   * Handles TDS deduction automatically
   */
  static async credit(
    tx: any,
    userId: number,
    userType: UserType,
    grossPoints: number,
    options: CreditOptions
  ): Promise<{ netPoints: number; tdsAmount: number }> {
    if (grossPoints <= 0) {
      throw new AppError('Points must be greater than zero', 400);
    }

    // Apply TDS
    const { netPoints, tdsAmount } = await TdsModule.calculateTds(userId, grossPoints);
    if (netPoints <= 0) return { netPoints: 0, tdsAmount };

    const { txnTable, logTable, ledgerTable, profileTable } = this.getTables(userType);

    // Get earning type
    const [earningType] = await tx
      .select()
      .from(earningTypes)
      .where(eq(earningTypes.name, options.earningTypeName))
      .limit(1);

    if (!earningType) {
      throw new AppError(`Earning type "${options.earningTypeName}" not found`, 500);
    }

    const earningTypeId = earningType.id;

    // 1. Insert Transaction
    await tx.insert(txnTable).values({
      userId,
      earningType: earningTypeId,
      points: String(netPoints),
      category: options.category || null,
      qrCode: options.qrCode || null,
      latitude: options.latitude !== undefined ? String(options.latitude) : null,
      longitude: options.longitude !== undefined ? String(options.longitude) : null,
      metadata: options.metadata || {},
      schemeId: options.schemeId || null,
    });

    // 2. Insert Log
    await tx.insert(logTable).values({
      userId,
      earningType: earningTypeId,
      points: String(netPoints),
      category: options.category || null,
      status: 'SUCCESS',
      qrCode: options.qrCode || null,
      latitude: options.latitude !== undefined ? String(options.latitude) : null,
      longitude: options.longitude !== undefined ? String(options.longitude) : null,
      metadata: options.metadata || {},
    });

    // 3. Update Profile Balance
    await tx
      .update(profileTable)
      .set(sql`points_balance = points_balance + ${netPoints}, total_earnings = total_earnings + ${netPoints}`)
      .where(eq(profileTable.userId, userId));

    // 4. Update Central Users Table
    await tx
      .update(users)
      .set(sql`points_balance = points_balance + ${netPoints}, total_earnings = total_earnings + ${netPoints}`)
      .where(eq(users.id, userId));

    // 5. Ledger Entry
    const [profile] = await tx
      .select({ pointsBalance: profileTable.pointsBalance })
      .from(profileTable)
      .where(eq(profileTable.userId, userId))
      .limit(1);

    const closingBalance = Number(profile?.pointsBalance || 0);
    const openingBalance = closingBalance - netPoints;

    await tx.insert(ledgerTable).values({
      userId,
      earningType: earningTypeId,
      redemptionType: 0,
      amount: String(netPoints),
      type: 'CREDIT',
      remarks: options.remarks || options.earningTypeName,
      openingBalance: String(openingBalance),
      closingBalance: String(closingBalance),
    });

    return { netPoints, tdsAmount };
  }
}