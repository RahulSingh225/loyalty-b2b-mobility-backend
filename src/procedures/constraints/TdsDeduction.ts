import { eq, and } from 'drizzle-orm';
import { ConstraintContext, ScanConstraint } from './Constraints';
import { tdsRecords, masterData } from '../../schema';
import { Database } from '../../config/db';

export class TdsDeductionConstraint implements ScanConstraint {
  appliesTo: UserType[] = ['CounterSales', 'Electrician', 'Retailer'];

  /**
   * Calculates financial year from date (April 1 - March 31)
   * e.g., May 2024 -> "2024-2025"
   */
  private getFinancialYear(date: Date = new Date()): string {
    const month = date.getMonth();
    const year = date.getFullYear();
    
    if (month >= 3) { // April (3) onwards
      return `${year}-${year + 1}`;
    } else { // January to March
      return `${year - 1}-${year}`;
    }
  }

  /**
   * Get TDS percentage from master table
   * Looks for key like "TDS_PERCENTAGE" or "TDS_PERCENT_{userType}"
   */
  private async getTdsPercentage(
    tx: any,
    userType: UserType
  ): Promise<number> {
    const [config] = await tx
      .select()
      .from(masterData)
      .where(
        and(
          eq(masterData.key, `TDS_PERCENTAGE_${userType.toUpperCase()}`),
          eq(masterData.isActive, true)
        )
      )
      .limit(1);

    if (!config) {
      // Fallback to generic TDS_PERCENTAGE
      const [generic] = await tx
        .select()
        .from(masterData)
        .where(
          and(
            eq(masterData.key, 'TDS_PERCENTAGE'),
            eq(masterData.isActive, true)
          )
        )
        .limit(1);
      return generic ? parseFloat(generic.value || '0') : 0;
    }

    return parseFloat(config.value || '0');
  }

  /**
   * Get or create TDS record for current FY
   */
  private async getTdsRecordForFy(
    tx: any,
    userId: number,
    fy: string
  ): Promise<any> {
    const [record] = await tx
      .select()
      .from(tdsRecords)
      .where(
        and(
          eq(tdsRecords.userId, userId),
          eq(tdsRecords.financialYear, fy)
        )
      )
      .limit(1);

    if (record) return record;

    // Create new TDS record for this FY
    const [newRecord] = await tx
      .insert(tdsRecords)
      .values({
        userId,
        financialYear: fy,
        tdsKitty: '0',
        tdsDeducted: '0',
        status: 'active',
        metadata: { transactionCount: 0 },
      })
      .returning();

    return newRecord;
  }

  /**
   * Main TDS deduction logic
   * - Calculates TDS based on earning
   * - Reduces netPoints in context
   * - Tracks TDS in kitty
   * - Handles 20k threshold crossing
   * - Logs all changes
   */
  async execute(ctx: ConstraintContext): Promise<void> {
    try {
      const tdsPercent = await this.getTdsPercentage(ctx.tx, ctx.userType);
      
      if (tdsPercent === 0) return; // No TDS applicable

      const fy = this.getFinancialYear();
      const tdsAmount = Math.floor(ctx.netPoints * (tdsPercent / 100));

      if (tdsAmount === 0) return; // TDS too small to deduct

      // Get or create TDS record for FY
      let tdsRecord = await this.getTdsRecordForFy(ctx.tx, ctx.userId, fy);

      const currentKitty = parseFloat(tdsRecord.tdsKitty || '0');
      const currentDeducted = parseFloat(tdsRecord.tdsDeducted || '0');
      const newKitty = currentKitty + tdsAmount;

      let newTdsDeducted = currentDeducted;
      let recordStatus = 'active';

      // If new kitty crosses 20k, move excess to deducted
      if (newKitty >= 20000) {
        newTdsDeducted = currentDeducted + newKitty;
        recordStatus = 'settled';
      }

      // Update TDS record
      const metadata = tdsRecord.metadata || {};
      metadata.transactionCount = (metadata.transactionCount || 0) + 1;
      metadata.lastTdsDeductionDate = new Date().toISOString();
      metadata.lastDeductedAmount = tdsAmount;

      await ctx.tx
        .update(tdsRecords)
        .set({
          tdsKitty: recordStatus === 'settled' ? '0' : newKitty.toString(),
          tdsDeducted: newTdsDeducted.toString(),
          status: recordStatus,
          settledAt: recordStatus === 'settled' ? new Date() : tdsRecord.settledAt,
          metadata,
          updatedAt: new Date(),
        })
        .where(eq(tdsRecords.id, tdsRecord.id));

      // Reduce netPoints by TDS amount
      ctx.netPoints -= tdsAmount;
    } catch (error) {
      console.error('TDS Deduction Constraint Error:', error);
      // Don't throw - TDS failure shouldn't block earning
    }
  }

  /**
   * Handle FY boundary reset (April 1st)
   * Call this as a scheduled job or manual process at FY boundary
   */
  static async handleFyReset(
    tx: any,
    userId: number,
    previousFy: string,
    newFy: string
  ): Promise<void> {
    // Get previous FY record
    const [prevRecord] = await tx
      .select()
      .from(tdsRecords)
      .where(
        and(
          eq(tdsRecords.userId, userId),
          eq(tdsRecords.financialYear, previousFy)
        )
      )
      .limit(1);

    if (!prevRecord) return;

    const tdsKitty = parseFloat(prevRecord.tdsKitty || '0');
    const status = tdsKitty >= 20000 ? 'settled' : 'reverted';
    const reversedAmount = status === 'reverted' ? tdsKitty : 0;

    // Update previous FY record
    await tx
      .update(tdsRecords)
      .set({
        status,
        reversedAmount: reversedAmount.toString(),
        settledAt: new Date(),
        metadata: {
          ...prevRecord.metadata,
          fyResetDate: new Date().toISOString(),
          action: status === 'settled' ? 'TDS_DEDUCTED' : 'TDS_REVERTED',
        },
        updatedAt: new Date(),
      })
      .where(eq(tdsRecords.id, prevRecord.id));

    // Create new FY record if it doesn't exist
    const [existingNew] = await tx
      .select()
      .from(tdsRecords)
      .where(
        and(
          eq(tdsRecords.userId, userId),
          eq(tdsRecords.financialYear, newFy)
        )
      )
      .limit(1);

    if (!existingNew) {
      await tx
        .insert(tdsRecords)
        .values({
          userId,
          financialYear: newFy,
          tdsKitty: '0',
          tdsDeducted: '0',
          status: 'active',
          metadata: {
            transactionCount: 0,
            reversedFromPreviousFy: status === 'reverted' ? reversedAmount : 0,
          },
        });
    }
  }

  /**
   * Get TDS summary for user across all years
   */
  static async getTdsSummary(tx: any, userId: number): Promise<any> {
    const records = await tx
      .select()
      .from(tdsRecords)
      .where(eq(tdsRecords.userId, userId));

    const totalTds = records.reduce(
      (sum: number, r: any) => sum + parseFloat(r.tdsDeducted || '0'),
      0
    );

    const currentFy = new TdsDeductionConstraint().getFinancialYear();
    const [currentRecord] = records.filter(
      (r: any) => r.financialYear === currentFy
    );

    return {
      currentFy,
      currentKitty: currentRecord ? parseFloat(currentRecord.tdsKitty || '0') : 0,
      totalDeducted: totalTds,
      records: records.map((r: any) => ({
        fy: r.financialYear,
        kitty: parseFloat(r.tdsKitty || '0'),
        deducted: parseFloat(r.tdsDeducted || '0'),
        reversed: parseFloat(r.reversedAmount || '0'),
        status: r.status,
        settledAt: r.settledAt,
      })),
    };
  }
}
