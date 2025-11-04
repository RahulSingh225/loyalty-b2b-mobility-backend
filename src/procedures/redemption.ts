import { Procedure } from './base';
import { eq, sql } from 'drizzle-orm';
import { redemptions, redemptionChannels, redemptionStatuses, users } from '../schema';
import { z } from 'zod';

const redemptionInputSchema = z.object({
  channelId: z.number(),
  pointsRedeemed: z.number().positive(),
  amount: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export class RedemptionProcedure extends Procedure<{ channelId: number; pointsRedeemed: number; amount?: number; metadata?: any }, { success: boolean; redemptionId: string; message: string }> {
  async execute(): Promise<{ success: boolean; redemptionId: string; message: string }> {
    const validated = redemptionInputSchema.parse(this.input);

    await this.logEvent('REDEMPTION_REQUEST', undefined, { points: validated.pointsRedeemed });

    return this.withTransaction(async (tx) => {
      const [user] = await tx.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, this.userId!));
      if (user!.pointsBalance < validated.pointsRedeemed) {
        await this.logEvent('REDEMPTION_REJECTED', undefined, { reason: 'Insufficient balance' });
        throw new AppError('Insufficient points', 400);
      }

      const [pendingStatus] = await tx.select().from(redemptionStatuses).where(eq(redemptionStatuses.name, 'Pending'));
      const redemptionId = `RED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const [newRedemption] = await tx.insert(redemptions).values({
        userId: this.userId!,
        redemptionId,
        channelId: validated.channelId,
        pointsRedeemed: validated.pointsRedeemed,
        amount: validated.amount,
        status: pendingStatus!.id,
        metadata: validated.metadata || {},
      }).returning();

      await tx.update(users).set(sql`points_balance = points_balance - ${validated.pointsRedeemed}`).where(eq(users.id, this.userId!));

      await this.logEvent('REDEMPTION_APPROVED', newRedemption.id, { redemptionId });

      return { success: true, redemptionId, message: 'Redemption requested' };
    });
  }
}
