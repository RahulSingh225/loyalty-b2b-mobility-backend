import { Procedure } from './base';
import { eq } from 'drizzle-orm';
import { users, approvalStatuses, retailers, counterSales, electricians, userTypeEntity, userAssociations } from '../schema';
import { z } from 'zod';
import { APPROVAL_STATUS } from '../utils/approvalStatus';

const approveInputSchema = z.object({
  userId: z.number(),
  documents: z.record(z.any()).optional(),
});

export class KycApproveProcedure extends Procedure<{ userId: number; documents?: any }, { success: boolean; message: string }> {
  async execute(): Promise<{ success: boolean; message: string }> {
    const validated = approveInputSchema.parse(this.input);

    return this.withTransaction(async (tx) => {
      // 1. Identify User Type
      const [user] = await tx.select({ roleId: users.roleId }).from(users).where(eq(users.id, validated.userId)).limit(1);
      if (!user) throw new Error('User not found');

      const [role] = await tx.select({ typeName: userTypeEntity.typeName }).from(userTypeEntity).where(eq(userTypeEntity.id, user.roleId)).limit(1);
      if (!role) throw new Error('Role not found');

      // 2. Decide next status
      let targetStatusName: string = APPROVAL_STATUS.KYC_APPROVED;
      if (role.typeName === 'Counter Staff') {
        targetStatusName = APPROVAL_STATUS.TDS_CONSENT_PENDING;
      }

      const [targetStatus] = await tx.select().from(approvalStatuses).where(eq(approvalStatuses.name, targetStatusName));
      if (!targetStatus) throw new Error(`Status '${targetStatusName}' not found`);

      // 3. Update User Status
      await tx.update(users).set({ approvalStatusId: targetStatus.id }).where(eq(users.id, validated.userId));

      // Sync user association status if it exists
      await tx.update(userAssociations)
        .set({ status: targetStatusName, updatedAt: new Date().toISOString() })
        .where(eq(userAssociations.childUserId, validated.userId));

      // 4. Update Role-specific KYC status
      const kycUpdate = {
        isKycVerified: true,
        kycDocuments: validated.documents || {},
      };

      if (role.typeName === 'Retailer') {
        await tx.update(retailers).set(kycUpdate).where(eq(retailers.userId, validated.userId));
      } else if (role.typeName === 'Counter Staff') {
        await tx.update(counterSales).set(kycUpdate).where(eq(counterSales.userId, validated.userId));
      } else if (role.typeName === 'Electrician') {
        await tx.update(electricians).set(kycUpdate).where(eq(electricians.userId, validated.userId));
      }

      // 🔥 Emit USER_KYC_APPROVED — ReferralBonusHandler and NotificationHandler
      // will pick this up from the event bus
      await this.emitEvent('USER_KYC_APPROVED', validated.userId, {
        role: role.typeName,
        targetStatus: targetStatusName,
      });

      return { success: true, message: `KYC approved. Next status: ${targetStatusName}` };
    });
  }
}
