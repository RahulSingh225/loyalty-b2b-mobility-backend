import { Procedure } from './base';
import { eq } from 'drizzle-orm';
import { users, approvalStatuses, retailers } from '../schema';
import { z } from 'zod';

const approveInputSchema = z.object({
  userId: z.number(),
  documents: z.record(z.any()).optional(),
});

export class KycApproveProcedure extends Procedure<{ userId: number; documents?: any }, { success: boolean; message: string }> {
  async execute(): Promise<{ success: boolean; message: string }> {
    const validated = approveInputSchema.parse(this.input);

    await this.logEvent('KYC_APPROVE', validated.userId);

    return this.withTransaction(async (tx) => {
      const [approvedStatus] = await tx.select().from(approvalStatuses).where(eq(approvalStatuses.name, 'Approved'));
      await tx.update(users).set({ approvalStatusId: approvedStatus!.id }).where(eq(users.id, validated.userId));

      await tx.update(retailers).set({
        isKycVerified: true,
        kycDocuments: validated.documents || {},
      }).where(eq(retailers.userId, validated.userId));

      return { success: true, message: 'KYC approved' };
    });
  }
}
