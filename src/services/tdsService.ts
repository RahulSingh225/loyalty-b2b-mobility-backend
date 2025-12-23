import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { tdsRecords, users } from '../schema';
import { BaseService } from './baseService';
import { TdsDeductionConstraint } from '../procedures/constraints/TdsDeduction';

export class TdsService extends BaseService<typeof tdsRecords> {
  constructor() {
    super(tdsRecords);
  }

  /**
   * Get TDS summary for a user
   */
  async getUserTdsSummary(userId: number) {
    const records = await db
      .select()
      .from(tdsRecords)
      .where(eq(tdsRecords.userId, userId))
      .orderBy(desc(tdsRecords.financialYear));

    const totalDeducted = records.reduce(
      (sum, r) => sum + parseFloat(r.tdsDeducted || '0'),
      0
    );

    const currentFy = new TdsDeductionConstraint().getFinancialYear() || 'N/A';
    const currentRecord = records.find((r) => r.financialYear === currentFy);

    return {
      userId,
      currentFy,
      currentKitty: currentRecord ? parseFloat(currentRecord.tdsKitty || '0') : 0,
      totalDeducted,
      fyRecords: records.map((r) => ({
        financialYear: r.financialYear,
        tdsKitty: parseFloat(r.tdsKitty || '0'),
        tdsDeducted: parseFloat(r.tdsDeducted || '0'),
        reversedAmount: parseFloat(r.reversedAmount || '0'),
        status: r.status,
        transactionCount: (r.metadata as any)?.transactionCount || 0,
        settledAt: r.settledAt,
      })),
    };
  }

  /**
   * Get TDS records for a financial year with pagination
   */
  async getTdsRecordsByFy(
    financialYear: string,
    opts: { page?: number; pageSize?: number } = {}
  ) {
    return this.findManyPaginated(
      { financialYear },
      { ...opts, orderBy: desc(tdsRecords.userId) }
    );
  }

  /**
   * Get TDS records by status (active, settled, reverted)
   */
  async getTdsRecordsByStatus(
    status: 'active' | 'settled' | 'reverted',
    opts: { page?: number; pageSize?: number } = {}
  ) {
    return this.findManyPaginated(
      { status },
      { ...opts, orderBy: desc(tdsRecords.updatedAt) }
    );
  }

  /**
   * Get all TDS records for a user with full audit trail
   */
  async getUserTdsHistory(
    userId: number,
    opts: { page?: number; pageSize?: number } = {}
  ) {
    return this.findManyPaginated(
      { userId },
      { ...opts, orderBy: desc(tdsRecords.financialYear) }
    );
  }

  /**
   * Trigger FY reset for all active users
   * Call on April 1st each year
   */
  async performFyReset(previousFy: string, newFy: string) {
    const activeRecords = await db
      .select({ userId: tdsRecords.userId })
      .from(tdsRecords)
      .where(
        and(
          eq(tdsRecords.financialYear, previousFy),
          eq(tdsRecords.status, 'active')
        )
      );

    const results = {
      processed: 0,
      settled: 0,
      reverted: 0,
      errors: 0,
    };

    for (const record of activeRecords) {
      try {
        await db.transaction(async (tx) => {
          const [prevRec] = await tx
            .select()
            .from(tdsRecords)
            .where(
              and(
                eq(tdsRecords.userId, record.userId),
                eq(tdsRecords.financialYear, previousFy)
              )
            )
            .limit(1);

          if (!prevRec) return;

          const kitty = parseFloat(prevRec.tdsKitty || '0');
          const isSettled = kitty >= 20000;

          await tx
            .update(tdsRecords)
            .set({
              status: isSettled ? 'settled' : 'reverted',
              reversedAmount: isSettled ? '0' : kitty.toString(),
              settledAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(tdsRecords.id, prevRec.id));

          // Create new FY record
          await tx.insert(tdsRecords).values({
            userId: record.userId,
            financialYear: newFy,
            tdsKitty: '0',
            tdsDeducted: '0',
            status: 'active',
            metadata: {
              transactionCount: 0,
              reversedFromPreviousFy: isSettled ? 0 : kitty,
            },
          });

          results.processed++;
          if (isSettled) results.settled++;
          else results.reverted++;
        });
      } catch (error) {
        console.error(`FY Reset failed for user ${record.userId}:`, error);
        results.errors++;
      }
    }

    return results;
  }

  /**
   * Get TDS statistics across all users
   */
  async getGlobalTdsStats() {
    const allRecords = await db.select().from(tdsRecords);

    const stats = {
      totalUsers: new Set(allRecords.map((r) => r.userId)).size,
      totalTdsDeducted: allRecords.reduce(
        (sum, r) => sum + parseFloat(r.tdsDeducted || '0'),
        0
      ),
      totalTdsInKitty: allRecords.reduce(
        (sum, r) => sum + parseFloat(r.tdsKitty || '0'),
        0
      ),
      totalReverted: allRecords.reduce(
        (sum, r) => sum + parseFloat(r.reversedAmount || '0'),
        0
      ),
      byStatus: {
        active: allRecords.filter((r) => r.status === 'active').length,
        settled: allRecords.filter((r) => r.status === 'settled').length,
        reverted: allRecords.filter((r) => r.status === 'reverted').length,
      },
      byFy: {} as Record<string, any>,
    };

    // Group by financial year
    for (const record of allRecords) {
      if (!stats.byFy[record.financialYear]) {
        stats.byFy[record.financialYear] = {
          deducted: 0,
          kitty: 0,
          reverted: 0,
          users: new Set(),
        };
      }
      stats.byFy[record.financialYear].deducted += parseFloat(
        record.tdsDeducted || '0'
      );
      stats.byFy[record.financialYear].kitty += parseFloat(
        record.tdsKitty || '0'
      );
      stats.byFy[record.financialYear].reverted += parseFloat(
        record.reversedAmount || '0'
      );
      stats.byFy[record.financialYear].users.add(record.userId);
    }

    // Convert Sets to counts
    Object.keys(stats.byFy).forEach((fy) => {
      stats.byFy[fy].userCount = stats.byFy[fy].users.size;
      delete stats.byFy[fy].users;
    });

    return stats;
  }

  /**
   * Audit user's TDS transactions in detail
   */
  async auditUserTds(userId: number) {
    const userRecords = await db
      .select()
      .from(tdsRecords)
      .where(eq(tdsRecords.userId, userId))
      .orderBy(desc(tdsRecords.financialYear));

    const [user] = await db
      .select({
        name: users.name,
        phone: users.phone,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId));

    return {
      user: user || { id: userId },
      auditTrail: userRecords.map((r) => ({
        financialYear: r.financialYear,
        tdsKitty: parseFloat(r.tdsKitty || '0'),
        tdsDeducted: parseFloat(r.tdsDeducted || '0'),
        reversedAmount: parseFloat(r.reversedAmount || '0'),
        status: r.status,
        settledAt: r.settledAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        metadata: r.metadata,
      })),
      summary: {
        totalDeducted: userRecords.reduce(
          (sum, r) => sum + parseFloat(r.tdsDeducted || '0'),
          0
        ),
        totalReverted: userRecords.reduce(
          (sum, r) => sum + parseFloat(r.reversedAmount || '0'),
          0
        ),
      },
    };
  }
}
