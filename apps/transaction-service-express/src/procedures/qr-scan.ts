import { Procedure } from './base';
import { eq, and, sql, qrCodes, retailerTransactions, users, skuPointConfig, skuVariant, skuEntity, earningTypes } from '@loyalty/shared-db';
import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler';

const scanInputSchema = z.object({
  qrCode: z.string().min(1).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  metadata: z.record(z.any()).optional(),
});

export class QrScanProcedure extends Procedure<{ qrCode: string; latitude: number; longitude: number; metadata?: any }, { success: boolean; points: number; message: string }> {
  async execute(): Promise<{ success: boolean; points: number; message: string }> {
    const validated = scanInputSchema.parse(this.input);

    await this.logEvent('SCAN_ATTEMPT', validated.qrCode, { latitude: validated.latitude, longitude: validated.longitude });

    return this.withTransaction(async (tx) => {
      const [qr] = await tx.select().from(qrCodes).where(
        and(eq(qrCodes.code, validated.qrCode), eq(qrCodes.isScanned, false))
      ).for('update of qrCodes').limit(1);  // Note: Drizzle supports FOR UPDATE

      if (!qr) {
        await this.logEvent('SCAN_FAILED', validated.qrCode, { reason: 'Invalid or scanned' });
        throw new AppError('Invalid or already scanned QR', 400);
      }

      const [config] = await tx
        .select({ pointsPerUnit: skuPointConfig.pointsPerUnit })
        .from(skuPointConfig)
        .innerJoin(skuVariant, eq(skuVariant.id, skuPointConfig.skuVariantId))
        .innerJoin(skuEntity, eq(skuEntity.id, skuVariant.skuEntityId))
        .innerJoin(users, eq(users.roleId, skuPointConfig.userTypeId))
        .where(
          and(
            eq(skuEntity.code, qr.sku),
            eq(users.id, this.userId!)
          )
        )
        .limit(1);

      const points = config?.pointsPerUnit ?? 10;

      await tx.update(qrCodes).set({
        isScanned: true,
        scannedBy: this.userId!,
      }).where(eq(qrCodes.id, qr.id));

      const [earningType] = await tx.select().from(earningTypes).where(eq(earningTypes.name, 'QR Scan')).limit(1);
      await tx.insert(retailerTransactions).values({
        userId: this.userId!,
        earningType: earningType!.id,
        points,
        category: qr.sku,
        qrCode: validated.qrCode,
        latitude: validated.latitude,
        longitude: validated.longitude,
        metadata: validated.metadata || {},
      });

      await tx.update(users).set(sql`points_balance = points_balance + ${points}, total_earnings = total_earnings + ${points}`).where(eq(users.id, this.userId!));

      await this.logEvent('SCAN_SUCCESS', qr.id, { points });

      return { success: true, points: Number(points), message: 'Scan successful' };
    });
  }
}