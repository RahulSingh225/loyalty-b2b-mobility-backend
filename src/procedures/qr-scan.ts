import { db } from '../config/db';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  qrCodes,
  users,
  skuPointConfig,
  skuVariant,
  skuEntity,
  earningTypes,
  participantSkuAccess
} from '../schema';
import { Procedure } from './base';
import { EarningCreditService } from '../services/earningcredit';
import { AppError } from '../middlewares/errorHandler';

const scanInputSchema = z.object({
  qrCode: z.string().min(1).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  metadata: z.record(z.any()).optional(),
});

import { UserType } from '../types';

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

    // Emit scan attempt
    await this.emitEvent('SCAN_ATTEMPT', validated.qrCode, {
      latitude: validated.latitude,
      longitude: validated.longitude,
    });

    return this.withTransaction(async (tx) => {
      const [qr] = await tx.select().from(qrCodes).where(
        and(eq(qrCodes.code, validated.qrCode), eq(qrCodes.isScanned, false))
      ).for('update of qrCodes').limit(1);

      if (!qr) {
        await this.emitEvent('SCAN_FAILED', validated.qrCode, { reason: 'Invalid or scanned' });
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

      // Update QR Code
      await tx.update(qrCodes).set({
        isScanned: true,
        scannedBy: this.userId!,
        locationAccess: { lat: validated.latitude, lng: validated.longitude }
      }).where(eq(qrCodes.id, qr.id));

      // Credit earnings
      await EarningCreditService.credit(tx, this.userId!, this.context.userType, points, {
        category: qr.sku,
        qrCode: validated.qrCode,
        latitude: validated.latitude,
        longitude: validated.longitude,
        metadata: { ...validated.metadata, scanType: 'primary' },
        earningTypeName: 'QR Scan',
      });

      // 🔥 Emit EARNING_SCAN — AuditLogHandler and NotificationHandler
      // will pick this up from the event bus
      await this.emitEvent('EARNING_SCAN', qr.id, { points });

      return { success: true, points: Number(points), message: 'Scan successful' };
    });
  }

  setContext(userId: number, ip: string, userAgent: string, metadata?: Record<string, any>): this {
    super.setContext(userId, ip, userAgent, metadata);
    return this;
  }
}
