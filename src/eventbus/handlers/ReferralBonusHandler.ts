/**
 * ReferralBonusHandler
 *
 * Awards referral bonus points to the referrer when a referred user's KYC is approved.
 * Extracted from KycApproveProcedure + ReferralProcedure.
 *
 * Config (from event_handler_config.config):
 *   bonusPoints: number — points to award the referrer (default: 500)
 */
import { IEventHandler, EventPayload } from '../IEventHandler';
import { db } from '../../config/db';
import { eq, and } from 'drizzle-orm';
import { users, userTypeEntity, referrals, earningTypes, eventMaster } from '../../schema';
import { EarningCreditService } from '../../services/earningcredit';

export class ReferralBonusHandler implements IEventHandler {
  readonly name = 'ReferralBonusHandler';

  shouldHandle(payload: EventPayload): boolean {
    // Must have a userId (the referred user whose KYC was approved)
    return !!payload.userId;
  }

  async handle(payload: EventPayload, config: Record<string, any>): Promise<void> {
    const referredUserId = payload.userId!;
    const bonusPoints = config.bonusPoints || 500;

    await db.transaction(async (tx) => {
      // 1. Get referred user and their referrer
      const [referredUser] = await tx
        .select({
          id: users.id,
          referrerId: users.referrerId,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, referredUserId))
        .limit(1);

      if (!referredUser || !referredUser.referrerId) {
        console.log(`[ReferralBonusHandler] User ${referredUserId} has no referrer. Skipping.`);
        return;
      }

      // 2. Check if bonus already awarded
      const [existingReferral] = await tx
        .select()
        .from(referrals)
        .where(
          and(
            eq(referrals.referrerId, referredUser.referrerId),
            eq(referrals.referredId, referredUserId)
          )
        )
        .limit(1);

      if (existingReferral && existingReferral.bonusAwarded && existingReferral.bonusAwarded > 0) {
        console.log(`[ReferralBonusHandler] Bonus already awarded for referral ${referredUser.referrerId} → ${referredUserId}. Skipping.`);
        return;
      }

      // 3. Get referrer details
      const [referrer] = await tx
        .select({
          id: users.id,
          roleId: users.roleId,
          roleName: userTypeEntity.typeName,
        })
        .from(users)
        .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
        .where(eq(users.id, referredUser.referrerId))
        .limit(1);

      if (!referrer) {
        console.warn(`[ReferralBonusHandler] Referrer ${referredUser.referrerId} not found. Skipping.`);
        return;
      }

      // 4. Ensure earning type exists
      const [existingEarningType] = await tx
        .select()
        .from(earningTypes)
        .where(eq(earningTypes.name, 'Referral Bonus'))
        .limit(1);

      if (!existingEarningType) {
        await tx.insert(earningTypes).values({
          name: 'Referral Bonus',
          description: 'Bonus points for referring new users',
        });
      }

      // 5. Credit points to referrer
      await EarningCreditService.credit(tx, referrer.id, referrer.roleName as any, bonusPoints, {
        earningTypeName: 'Referral Bonus',
        remarks: `Referral bonus for ${referredUser.name}`,
        metadata: { referredUserId },
      });

      // 6. Update or create referral record
      if (existingReferral) {
        await tx.update(referrals)
          .set({ bonusAwarded: bonusPoints, status: 'completed' })
          .where(eq(referrals.id, existingReferral.id));
      } else {
        await tx.insert(referrals).values({
          referrerId: referrer.id,
          referredId: referredUserId,
          bonusAwarded: bonusPoints,
          status: 'completed',
        });
      }

      console.log(`[ReferralBonusHandler] Credited ${bonusPoints} to referrer ${referrer.id} for referring user ${referredUserId}`);
    });
  }
}
