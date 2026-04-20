/**
 * WelcomeBonusHandler
 *
 * Awards registration bonus points when a USER_CREATED event fires.
 * Extracted from RegistrationProcedure lines 123-156.
 *
 * Config (from event_handler_config.config):
 *   bonusPoints: number — points to award (default: 100)
 */
import { IEventHandler, EventPayload } from '../IEventHandler';
import { db } from '../../config/db';
import { eq } from 'drizzle-orm';
import { users, userTypeEntity, earningTypes, electricians } from '../../schema';
import { EarningCreditService } from '../../services/earningcredit';

export class WelcomeBonusHandler implements IEventHandler {
  readonly name = 'WelcomeBonusHandler';

  shouldHandle(payload: EventPayload): boolean {
    return !!payload.userId;
  }

  async handle(payload: EventPayload, config: Record<string, any>): Promise<void> {
    const userId = payload.userId!;

    // Determine user type for EarningCreditService
    const [user] = await db
      .select({ roleId: users.roleId, panNumber: electricians.pan })
      .from(users)
      .leftJoin(electricians, eq(users.id, electricians.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.warn(`[WelcomeBonusHandler] User ${userId} not found. Skipping bonus.`);
      return;
    }


    const [role] = await db
      .select({ typeName: userTypeEntity.typeName })
      .from(userTypeEntity)
      .where(eq(userTypeEntity.id, user.roleId))
      .limit(1);



    if (!role) {
      console.warn(`[WelcomeBonusHandler] Role not found for user ${userId}. Skipping bonus.`);
      return;
    }

    // Ensure 'Registration Bonus' earning type exists
    const [existingEarningType] = await db
      .select()
      .from(earningTypes)
      .where(eq(earningTypes.name, 'Registration Bonus'))
      .limit(1);

    if (!existingEarningType) {
      await db.insert(earningTypes).values({
        name: 'Registration Bonus',
        description: 'Welcome bonus for new registration',
      });
    }

    let bonusPoints = 100;
    if (role.typeName === 'Electrician' && user.panNumber && user.panNumber.length > 0) {
      bonusPoints = 150;
    }

    if (bonusPoints === 0) {
      console.log(`[WelcomeBonusHandler] Skipping bonus for ${role.typeName} at registration. They will receive it on KYC approval.`);
      return;
    }

    // Credit via a fresh transaction (this runs async, outside the registration tx)
    await db.transaction(async (tx) => {
      await EarningCreditService.credit(tx, userId, role.typeName as any, bonusPoints, {
        earningTypeName: 'Registration Bonus',
        remarks: 'Welcome bonus for registration',
      });
    });

    console.log(`[WelcomeBonusHandler] Credited ${bonusPoints} points to user ${userId} (${role.typeName})`);
  }
}
