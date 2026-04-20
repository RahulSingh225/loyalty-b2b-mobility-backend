import { Procedure } from './base';
import { eq, and } from 'drizzle-orm';
import { users, referrals, userTypeEntity, eventMaster, earningTypes } from '../schema';
import { EarningCreditService } from '../services/earningcredit';
import { AppError } from '../middlewares/errorHandler';

/**
 * Procedure to handle referral earning events.
 * Award points to the referrer when a referred user completes a milestone (e.g. KYC approval).
 */
export class ReferralProcedure extends Procedure<{ referredUserId: number }, { success: boolean; points: number }> {
    async execute(): Promise<{ success: boolean; points: number }> {
        const { referredUserId } = this.input;

        return this.withTransaction(async (tx) => {
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
                // No referrer associated with this user
                return { success: false, points: 0 };
            }

            // 2. Check if bonus already awarded for this referral
            const [referralRecord] = await tx
                .select()
                .from(referrals)
                .where(
                    and(
                        eq(referrals.referrerId, referredUser.referrerId),
                        eq(referrals.referredId, referredUserId)
                    )
                )
                .limit(1);

            if (referralRecord && referralRecord.bonusAwarded && referralRecord.bonusAwarded > 0) {
                // Bonus already awarded
                return { success: false, points: 0 };
            }

            // 3. Get referrer details to know their userType for EarningCreditService
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
                throw new AppError('Referrer user not found', 404);
            }

            const bonusPoints = 500; // Standard referral bonus points

            // 4. Ensure REFERRAL_EARNING event exists in event_master
            let [event] = await tx.select().from(eventMaster).where(eq(eventMaster.eventKey, 'REFERRAL_EARNING'));
            if (!event) {
                [event] = await tx.insert(eventMaster).values({
                    eventKey: 'REFERRAL_EARNING',
                    name: 'Referral Earning',
                    category: 'EARNING',
                    isActive: true
                }).returning();
            }

            // 5. Credit points to the referrer
            // Ensure earning type exists
            let [earnType] = await tx.select().from(earningTypes).where(eq(earningTypes.name, 'Referral Bonus')).limit(1);
            if (!earnType) {
                await tx.insert(earningTypes).values({
                    name: 'Referral Bonus',
                    description: 'Bonus points for referring new users'
                });
            }

            // Note: EarningCreditService.credit handles different UserTypes correctly
            await EarningCreditService.credit(tx, referrer.id, referrer.roleName as any, bonusPoints, {
                earningTypeName: 'Referral Bonus',
                remarks: `Referral bonus for ${referredUser.name}`,
                metadata: { referredUserId },
            });

            // 6. Update or create the referral record to mark bonus as awarded
            if (referralRecord) {
                await tx.update(referrals)
                    .set({ bonusAwarded: bonusPoints, status: 'completed' })
                    .where(eq(referrals.id, referralRecord.id));
            } else {
                await tx.insert(referrals).values({
                    referrerId: referrer.id,
                    referredId: referredUserId,
                    bonusAwarded: bonusPoints,
                    status: 'completed',
                });
            }

            // 7. Log the referral earning event
            await this.emitEvent('REFERRAL_EARNING', referredUserId, {
                referrerId: referrer.id,
                points: bonusPoints,
            });

            return { success: true, points: bonusPoints };
        });
    }
}
