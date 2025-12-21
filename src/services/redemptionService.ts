import { BaseService } from './baseService';
import { redemptions } from '../schema';
import { desc, eq } from 'drizzle-orm';
import { PaginationOptions } from './baseService';

class RedemptionService extends BaseService<typeof redemptions> {
  async getRedemptionHistory(userId: number, opts: PaginationOptions = {}) {
    const { page = 1, pageSize = 20 } = opts;
    const result = await this.findManyPaginated(
      { userId },
      { page, pageSize, orderBy: desc(redemptions.createdAt) }
    );
    return result;
  }

  async getRedemptionHistoryByStatus(userId: number, status: number, opts: PaginationOptions = {}) {
    const { page = 1, pageSize = 20 } = opts;
    const result = await this.findManyPaginated(
      { userId, status },
      { page, pageSize, orderBy: desc(redemptions.createdAt) }
    );
    return result;
  }

  async getRedemptionDetail(redemptionId: number) {
    const [redemption] = await this.findOne({ id: redemptionId });
    return redemption;
  }

  async getUserRedemptionStats(userId: number) {
    const all = await this.findManyPaginated({ userId }, { pageSize: 1 });
    const totalRedemptions = all?.total || 0;
    
    // Get total points redeemed (sum)
    const result = await this.query((qb) =>
      qb
        .select({
          totalPoints: redemptions.pointsRedeemed,
          totalAmount: redemptions.amount,
        }).from(redemptions)
        .where(eq(redemptions.userId, userId))
    );
    
    return {
      totalRedemptions,
      totalPointsRedeemed: result[0]?.totalPoints || 0,
      totalAmountRedeemed: result[0]?.totalAmount || 0,
    };
  }
}

export const redemptionService = new RedemptionService(redemptions as any);
