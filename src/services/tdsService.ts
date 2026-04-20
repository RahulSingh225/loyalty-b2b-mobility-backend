import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import * as schema from '../schema';
import { tdsRecords, users } from '../schema';
import { BaseService } from './baseService';
import { TdsDeductionConstraint } from '../procedures/constraints/TdsDeduction';
import axios from 'axios';
import { userService } from './userService';
import { cacheMaster } from '../utils/masterCache';
import { APPROVAL_STATUS } from '../utils/approvalStatus';
import { generateUniqueReferralCode } from '../utils/referralCode';

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
  /**
   * Calculate and set TDS percentage for a user based on compliance
   */
  async calculateAndSetTdsPercentage(userId: number) {
    try {
      // 1. Get user profile to check PAN
      const profile = await userService.getProfile(userId);
      console.log('---------------', profile, '-----------')
      let tdsPercentage = 20;
      let complianceDetails = {
        validPan: false,
        panAadhaarLinked: false,
        compliant: false
      };
      console.log('---------------', profile.pan, '-----------')
      // 2. Check PAN compliance
      if (profile.pan) {
        try {
          const baseUrl = process.env.TENACIO_BASE_URL;
          const clientId = process.env.TENACIO_CLIENT_ID;
          const apiKey = process.env.TENACIO_API_KEY;
          const workflowId = process.env.TENACIO_ITR_WORKFLOW_ID;
          console.log(baseUrl, clientId, apiKey, workflowId)
          if (!baseUrl || !clientId || !apiKey || !workflowId) {
            console.error('Missing Tenacio ITR configuration in env');
            // Defaulting to 20% if config is missing
            console.log(baseUrl, clientId, apiKey, workflowId)
          } else {
            const response = await axios.post(
              `${baseUrl}/api/v1/services/itr-compliance-check`,
              {
                input: {
                  panNumber: profile.pan,
                  consent: true
                }
              },
              {
                headers: {
                  'client-id': clientId,
                  'x-api-key': apiKey,
                  'workflow-id': workflowId,
                  'Content-Type': 'application/json'
                }
              }
            );

            const data = response.data?.data;
            if (data) {
              console.log('---------------', data, '-----------')
              complianceDetails = {
                validPan: data.validPan,
                panAadhaarLinked: data.panAadhaarLinked,
                compliant: data.compliant
              };

              if (data.validPan && data.panAadhaarLinked && data.compliant) {
                tdsPercentage = 10;
              }

              const [activeStatus] = await db.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.name, APPROVAL_STATUS.ACTIVE)).limit(1);

              if (activeStatus) {
                let referralCodeUpdate = {};

                // Check and generate referral code if enabled
                const [userType] = await db
                  .select()
                  .from(schema.userTypeEntity)
                  .where(eq(schema.userTypeEntity.id, profile.roleId))
                  .limit(1);
                console.log(profile.referralCode)
                console.log('%%%%%%%%%%%%%%%%%%%%%%%%%', userType?.isReferralEnabled, !profile.referralCode)
                if (userType?.isReferralEnabled && !profile.referralCode) {
                  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%', 'Generating referral code for user', userId);
                  const newReferralCode = await generateUniqueReferralCode(userType.referralCodePrefix || '');
                  referralCodeUpdate = { referralCode: newReferralCode };
                }

                await db.update(users)
                  .set({
                    approvalStatusId: activeStatus.id,
                    ...referralCodeUpdate
                  })
                  .where(eq(users.id, userId));
              }
            }
          }
        } catch (error) {
          console.error('Error in Tenacio API:', error);
          // Keep default 20%
        }
      }

      // 3. Update DB
      await this.updateUserTdsPercentage(userId, tdsPercentage);

      return {
        userId,
        pan: profile.pan,
        tdsPercentage,
        complianceDetails
      };
    } catch (error) {
      console.error('Error calculating TDS percentage:', error);
      throw error;
    }
  }

  /**
   * Helper to update TDS percentage in role-specific table
   */
  async updateUserTdsPercentage(userId: number, percentage: number) {
    const [user] = await db
      .select({ roleId: users.roleId })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return;

    const userTypes = await cacheMaster(
      'userTypes',
      async () => db.select().from(schema.userTypeEntity).execute()
    );
    const userRole = userTypes.find((type) => type.id === user.roleId);

    if (!userRole) return;

    if (userRole.typeName === 'Retailer') {
      await db.update(schema.retailers)
        .set({ tdsPercentage: percentage })
        .where(eq(schema.retailers.userId, userId));
    } else if (userRole.typeName === 'Electrician') {
      await db.update(schema.electricians)
        .set({ tdsPercentage: percentage })
        .where(eq(schema.electricians.userId, userId));
    } else if (userRole.typeName === 'CounterSales' || userRole.typeName === 'Counter Staff') {
      await db.update(schema.counterSales)
        .set({ tdsPercentage: percentage })
        .where(eq(schema.counterSales.userId, userId));
    }
  }

  /**
   * Get TDS Certificate data for a user
   */
  async getTdsCertificate(userId: number, financialYear: string) {
    const profile = await userService.getProfile(userId);

    const records = await db
      .select()
      .from(tdsRecords)
      .where(and(eq(tdsRecords.userId, userId), eq(tdsRecords.financialYear, financialYear)))
      .limit(1);

    const record = records[0];

    // Prepare data for PDF generation (would normally use a library here)
    const certificateData = {
      userName: profile?.name || 'N/A',
      pan: profile?.pan || 'N/A',
      financialYear,
      totalEarnings: record ? (parseFloat(record.tdsDeducted || '0') * 10).toString() : '0', // Approx since ledger isn't summed here
      tdsDeducted: record ? record.tdsDeducted : '0',
      status: record ? record.status : 'N/A',
      url: `https://sturlite-bucket.s3.amazonaws.com/certificates/tds_${userId}_${financialYear}.pdf`, // Mock S3 URL
      generatedAt: new Date().toISOString(),
    };

    return certificateData;
  }
}
