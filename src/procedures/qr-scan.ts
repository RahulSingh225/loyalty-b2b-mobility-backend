import { db } from '../config/db';
import { eq, and, sql } from 'drizzle-orm';
import { eventMaster, systemLogs, eventLogs } from '../schema';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';
import { z } from 'zod';

import {
  qrCodes,
  users,
  skuPointConfig,
  skuVariant,
  skuEntity,
  earningTypes,
  retailers,
  electricians,
  counterSales,
  retailerTransactions,
  electricianTransactions,
  counterSalesTransactions,
  retailerTransactionLogs,
  electricianTransactionLogs,
  counterSalesTransactionLogs,
  retailerLedger,
  electricianLedger,
  counterSalesLedger,
  participantSkuAccess
} from '../schema';
import { Procedure } from './base';
import { EarningCreditService } from '../services/earningcredit';
import { TdsDeductionConstraint } from './constraints/TdsDeduction';



const scanInputSchema = z.object({
  qrCode: z.string().min(1).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  metadata: z.record(z.any()).optional(),
});

import { UserType } from '../types';

// Helper types
export interface ScanContext {
  userType: UserType;
  roleId: number;
}

export class QrScanProcedure extends Procedure<{ qrCode: string; latitude: number; longitude: number; metadata?: any }, { success: boolean; points: number; message: string }> {
  private context: ScanContext;
  private constraints: any[];

  constructor(input: { qrCode: string; latitude: number; longitude: number; metadata?: any }, context: ScanContext, constraints: any[] = []) {
    super(input);
    this.context = context;
    this.constraints = constraints;
  }

  async execute(): Promise<{ success: boolean; points: number; message: string }> {
    const validated = scanInputSchema.parse(this.input);

    await this.logEvent('SCAN_ATTEMPT', validated.qrCode, { latitude: validated.latitude, longitude: validated.longitude });

    return this.withTransaction(async (tx) => {
      const [qr] = await tx.select().from(qrCodes).where(
        and(eq(qrCodes.code, validated.qrCode), eq(qrCodes.isScanned, false))
      ).for('update of qrCodes').limit(1);  // Row lock to prevent race conditions

      if (!qr) {
        await this.logEvent('SCAN_FAILED', validated.qrCode, { reason: 'Invalid or scanned' });
        throw new AppError('Invalid or already scanned QR', 400);
      }

      // Get Point Config
      const [config] = await tx
        .select({
          pointsPerUnit: skuPointConfig.pointsPerUnit,
          entityId: skuEntity.id
        })
        .from(skuPointConfig)
        .innerJoin(skuVariant, eq(skuVariant.id, skuPointConfig.skuVariantId))
        .innerJoin(skuEntity, eq(skuEntity.id, skuVariant.skuEntityId))
        .where(
          and(
            eq(skuEntity.code, qr.sku),
            eq(skuPointConfig.userTypeId, this.context.roleId)
          )
        )
        .limit(1);

      if (!config) {
        throw new AppError('Product not configured for this user type', 400);
      }

      let points = Number(config.pointsPerUnit);

      // Participant SKU Access Check
      const [skuAccess] = await tx.select().from(participantSkuAccess).where(
        and(
          eq(participantSkuAccess.userId, this.userId!),
          eq(participantSkuAccess.skuEntityId, config.entityId),
          eq(participantSkuAccess.isActive, true)
        )
      ).limit(1);

      if (!skuAccess) {
        throw new AppError('SKU not accessible to user', 403);
      }

      // Apply TDS if applicable (using separate TDS module)
      // const tdsResult = await TdsModule.calculateTds(this.userId!, points);
      // points = tdsResult.netPoints;
      // const tdsDeducted = tdsResult.tdsAmount;

      // Update QR Code
      await tx.update(qrCodes).set({
        isScanned: true,
        scannedBy: this.userId!,
        locationAccess: { lat: validated.latitude, lng: validated.longitude }
      }).where(eq(qrCodes.id, qr.id));



      await EarningCreditService.credit(tx, this.userId!, this.context.userType, points, {
        category: qr.sku,
        qrCode: validated.qrCode,
        latitude: validated.latitude,
        longitude: validated.longitude,
        metadata: { ...validated.metadata, scanType: 'primary' },
        earningTypeName: 'QR Scan',
      });

      // Resolve tables based on userType
      let txnTable, logTable, ledgerTable, profileTable;




      // Log success with TDS info if deducted
      await this.logEvent('SCAN_SUCCESS', qr.id, { points });

      return { success: true, points: Number(points), message: 'Scan successful' };
    });
  }

  private async applyConstraints(tx: any, constraints: any[], validated: any, qr: any, points: number): Promise<void> {
    // TODO: Implement constraint logic
    for (const constraint of constraints) {
      await constraint.execute({
        tx,
        userId: this.userId!,
        userType: this.context.userType,
        roleId: this.context.roleId,
        qr,
        points,
        netPoints: points, // Assuming no TDS for now
        primaryScan: true,
      });
    }
  }

  setContext(userId: number, ip: string, userAgent: string, metadata?: Record<string, any>): this {
    super.setContext(userId, ip, userAgent, metadata);
    return this;
  }

}

// Separate TDS Logic Module
// export class TdsModule {
//   static async calculateTds(userId: number, grossPoints: number): Promise<{ netPoints: number; tdsAmount: number }> {
//     // Fetch user's TDS percent (assuming users table has tdsPercent column; adjust schema if needed)
//     const [user] = await db.select({ tdsPercent: users.tdsPercent }).from(users).where(eq(users.id, userId)).limit(1);

//     if (!user || user.tdsPercent === null || user.tdsPercent === 0) {
//       return { netPoints: grossPoints, tdsAmount: 0 };
//     }

//     const tdsPercent = Number(user.tdsPercent);
//     if (isNaN(tdsPercent) || tdsPercent < 0 || tdsPercent > 100) {
//       throw new AppError('Invalid TDS percent for user', 500);
//     }

//     const tdsAmount = (grossPoints * tdsPercent) / 100;
//     const netPoints = grossPoints - tdsAmount;

//     // Optionally log or insert TDS deduction record (e.g., into a tdsLogs table)
//     // await db.insert(tdsLogs).values({ userId, grossPoints, tdsAmount, netPoints, type: 'EARNING' });

//     return { netPoints, tdsAmount };
//   }
// }