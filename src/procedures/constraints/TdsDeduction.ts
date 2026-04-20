import { eq, and } from 'drizzle-orm';
import { ConstraintContext, ScanConstraint } from './Constraints';
import { tdsRecords, counterSales, electricians, retailers } from '../../schema';
import { UserType } from '../../types';

export class TdsDeductionConstraint implements ScanConstraint {
  appliesTo: UserType[] = ['CounterSales', 'Electrician', 'Retailer', 'Counter Staff'];

  /**
   * Calculates financial year from date (April 1 - March 31)
   * e.g., May 2024 -> "2024-2025"
   */
  public getFinancialYear(date: Date = new Date()): string {
    const month = date.getMonth();
    const year = date.getFullYear();

    if (month >= 3) { // April (3) onwards
      return `${year}-${year + 1}`;
    } else { // January to March
      return `${year - 1}-${year}`;
    }
  }

  /**
   * Get TDS percentage from user's master table record
   * Falls back to masterData table if not found in user record
   */
  private async getTdsPercentage(
    tx: any,
    userId: number,
    userType: UserType
  ): Promise<number> {
    let tdsPercent = 0;

    // Fetch from respective master table based on user type
    if (userType === 'CounterSales' || userType === 'Counter Staff') {
      const [user] = await tx
        .select({ tdsPercentage: counterSales.tdsPercentage })
        .from(counterSales)
        .where(eq(counterSales.userId, userId))
        .limit(1);
      tdsPercent = user ? (user.tdsPercentage || 0) : 0;
    } else if (userType === 'Electrician') {
      const [user] = await tx
        .select({ tdsPercentage: electricians.tdsPercentage })
        .from(electricians)
        .where(eq(electricians.userId, userId))
        .limit(1);
      tdsPercent = user ? (user.tdsPercentage || 0) : 0;
    } else if (userType === 'Retailer') {
      const [user] = await tx
        .select({ tdsPercentage: retailers.tdsPercentage })
        .from(retailers)
        .where(eq(retailers.userId, userId))
        .limit(1);
      tdsPercent = user ? (user.tdsPercentage || 0) : 0;
    }


    return tdsPercent;
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
   * - Fetches TDS % from user's master table
   * - Calculates TDS based on earning
   * - Reduces netPoints in context
   * - Tracks TDS in kitty
   * - Handles 20k threshold crossing
   * - Logs all changes
   */
  async execute(ctx: ConstraintContext) {
    try {
      const tdsPercent = await this.getTdsPercentage(ctx.tx, ctx.userId, ctx.userType);
      console.log(ctx.userId, ctx.userType)
      console.log('????????', tdsPercent, '??????');
      if (tdsPercent === 0) return; // No TDS applicable

      const fy = this.getFinancialYear();
      // const tdsAmount = Math.floor(ctx.netPoints * (tdsPercent / 100));
      const rawTds = ctx.netPoints * (tdsPercent / 100);
      const tdsAmount = Number(rawTds.toFixed(2));
      console.log('!!!!!', rawTds, tdsAmount, '!!!!!')
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

      //NEW LOGIC
      // totalEarnings: string; // cumulative points for FY
      //       const THRESHOLD = 20000;

      // const currentKitty = parseFloat(tdsRecord.tdsKitty || '0');
      // const currentDeducted = parseFloat(tdsRecord.tdsDeducted || '0');
      // const currentEarnings = parseFloat(tdsRecord.totalEarnings || '0');

      // // 👉 Add current transaction earnings
      // const newTotalEarnings = currentEarnings + ctx.netPoints;

      // let newKitty = currentKitty;
      // let newTdsDeducted = currentDeducted;
      // let recordStatus = 'active';

      // // 🔥 CASE 1: Still below threshold → hold TDS
      // if (newTotalEarnings < THRESHOLD) {
      //   newKitty += tdsAmount;
      // }

      // // 🔥 CASE 2: Threshold crossed NOW
      // else if (currentEarnings < THRESHOLD && newTotalEarnings >= THRESHOLD) {
      //   // Move ALL kitty + current TDS to deducted
      //   newTdsDeducted += (currentKitty + tdsAmount);
      //   newKitty = 0;
      //   recordStatus = 'settled';
      // }

      // // 🔥 CASE 3: Already above threshold
      // else {
      //   newTdsDeducted += tdsAmount;
      //   newKitty = 0;
      //   recordStatus = 'settled';
      // }

      //  await ctx.tx
      // .update(tdsRecords)
      // .set({
      //   totalEarnings: newTotalEarnings.toString(), // ✅ NEW
      //   tdsKitty: newKitty.toString(),
      //   tdsDeducted: newTdsDeducted.toString(),
      //   status: recordStatus,
      //   settledAt: recordStatus === 'settled' ? new Date() : tdsRecord.settledAt,
      //   metadata,
      //   updatedAt: new Date(),
      // })
      // .where(eq(tdsRecords.id, tdsRecord.id));

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

      // Sync with user's master table
      const profileUpdates: any = {
        tdsKitty: recordStatus === 'settled' ? '0' : newKitty.toString(),
        tdsDeducted: newTdsDeducted.toString(),
      };

      if (ctx.userType === 'CounterSales' || ctx.userType === 'Counter Staff') {
        await ctx.tx.update(counterSales).set(profileUpdates).where(eq(counterSales.userId, ctx.userId));
      } else if (ctx.userType === 'Electrician') {
        await ctx.tx.update(electricians).set(profileUpdates).where(eq(electricians.userId, ctx.userId));
      } else if (ctx.userType === 'Retailer') {
        await ctx.tx.update(retailers).set(profileUpdates).where(eq(retailers.userId, ctx.userId));
      }

      // Reduce netPoints by TDS a mount
      console.log('#####', ctx.netPoints, tdsAmount, '#####')
      ctx.netPoints -= tdsAmount;
      return ctx.netPoints;
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
    // NEW LOGIC
    //const totalEarnings = parseFloat(prevRecord.totalEarnings || '0');  
    //const status = totalEarnings >= 20000 ? 'settled' : 'reverted';

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
