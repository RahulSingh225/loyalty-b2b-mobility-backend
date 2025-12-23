import { retailers, userAssociations } from '../../schema';
import { eq } from 'drizzle-orm';
import { ConstraintContext, ScanConstraint } from './Constraints';
import { EarningCreditService } from '../../services/earningcredit';
import { UserType } from '../../types';

export class AutoCreditCounterStaffOnRetailerScan implements ScanConstraint {
  appliesTo: UserType[] = ['Retailer'];

  async execute(ctx: ConstraintContext): Promise<void> {

    const [retailer] = await ctx.tx
      .select({ linkedCounterId: userAssociations.childUserId })
      .from(userAssociations)
      .where(eq(userAssociations.parentUserId, ctx.userId))
      .limit(1);

    if (!retailer?.linkedCounterId) return;

    await EarningCreditService.credit(
      ctx.tx,
      retailer.linkedCounterId,
      'Counter Staff',
      ctx.netPoints, // or a different amount, e.g., ctx.netPoints * 0.5 for half bonus
      {
        category: ctx.qr.sku,
        qrCode: ctx.qr.code,
        latitude: null,
        longitude: null,
        metadata: {
          source: 'Retailer Scan Bonus',
          triggeredByUserId: ctx.userId,
          originalQrScan: true,
        },
        remarks: 'Bonus from linked Retailer QR scan',
        earningTypeName: 'QR Scan - Indirect',
      }
    );
  }
}