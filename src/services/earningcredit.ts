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
  tdsRecords,
} from '../schema';
import { AppError } from '../middlewares/errorHandler';
import { TdsService } from './tdsService';
import { TdsDeductionConstraint } from '../procedures/constraints/TdsDeduction';

import { UserType } from '../types';

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
    const tdsConstraint = new TdsDeductionConstraint();

    // Map user type for TDS constraint
    let tdsUserType: 'CounterSales' | 'Electrician' | 'Retailer';
    if (userType === 'Counter Staff') {
      tdsUserType = 'CounterSales';
    } else {
      tdsUserType = userType as 'Electrician' | 'Retailer';
    }

    const context = {
      tx,
      userId,
      userType: tdsUserType,
      roleId: 0, // Not strictly used by TdsDeductionConstraint
      qr: options.qrCode ? { code: options.qrCode } : null,
      points: grossPoints,
      netPoints: grossPoints,
      primaryScan: true
    };

    await tdsConstraint.execute(context as any);
    const netPoints = context.netPoints;
    const tdsAmount = grossPoints - netPoints;

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
      points: String(grossPoints),
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
      points: String(grossPoints),
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