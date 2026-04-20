// src/procedures/redemption.ts
import { Procedure } from './base';
import { eq, sql } from 'drizzle-orm';
import {
  redemptions,
  redemptionChannels,
  redemptionStatuses,
  users,
  userTypeEntity,
  retailers,
  electricians,
  counterSales,
  retailerLedger,
  electricianLedger,
  counterSalesLedger,
  redemptionVouchers
} from '../schema';
import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler';
import { razorpayService, PayoutRequest } from '../services/razorpayService';
import { redemptionService } from '../services/redemptionService';
// import approvalService from '../services/approval.service';

const redemptionInputSchema = z.object({
  channelId: z.number(),
  pointsRedeemed: z.number().positive(),
  amount: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  redemptionType: z.enum(['UPI', 'BANK_TRANSFER', 'E_VOUCHER', 'PHYSICAL_REWARD', 'MARKETPLACE']).optional(),
  orderId: z.string().optional(),
  items: z.array(z.record(z.any())).optional(),
  channelReferenceId: z.number().optional(),
});

export class RedemptionProcedure extends Procedure<{
  channelId: number;
  pointsRedeemed: number;
  amount?: number;
  metadata?: any;
  redemptionType?: string;
  orderId?: string;
  items?: any[];
  channelReferenceId?: number;
}, {
  success: boolean;
  redemptionId: string;
  message: string;
  requiresApproval?: boolean;
  approvalId?: number;
}> {
  async execute(): Promise<{
    success: boolean;
    redemptionId: string;
    message: string;
    requiresApproval?: boolean;
    approvalId?: number;
  }> {
    const validated = redemptionInputSchema.parse(this.input);

    console.log(validated)
    if (validated.amount < 200) {
      throw new AppError('Amount should be greater than 200', 400);
    }

    // 🔥 Emit redemption request event
    await this.emitEvent('REDEMPTION_REQUEST', undefined, {
      points: validated.pointsRedeemed,
      type: validated.redemptionType,
    });

    return this.withTransaction(async (tx) => {
      // 1. Get User Role and Balance
      const [userWithRole] = await tx
        .select({
          roleName: userTypeEntity.typeName,
          allowedRedemptionChannels: userTypeEntity.allowedRedemptionChannels,
        })
        .from(users)
        .innerJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
        .where(eq(users.id, this.userId!));

      console.log('User Role:', userWithRole);

      if (!userWithRole) {
        throw new AppError('User not found', 404);
      }

      const userRole = userWithRole.roleName;
      const rawAllowed = userWithRole.allowedRedemptionChannels;

      // Normalize allowed channels into an array of IDs
      let allowedChannelIds: number[] = [];
      if (Array.isArray(rawAllowed)) {
        allowedChannelIds = rawAllowed.map((r: any) => Number(r));
      } else if (typeof rawAllowed === 'string') {
        try {
          const parsed = JSON.parse(rawAllowed);
          if (Array.isArray(parsed)) allowedChannelIds = parsed.map((r: any) => Number(r));
          else allowedChannelIds = rawAllowed.split(',').map((s) => Number(s.trim()));
        } catch (e) {
          allowedChannelIds = rawAllowed.split(',').map((s) => Number(s.trim()));
        }
      } else if (typeof rawAllowed === 'number') {
        allowedChannelIds = [Number(rawAllowed)];
      }

      // Validate redemption channel: fetch redemption type (name) when not provided
      let currentRedemptionType
      const requestedChannelId = Number(validated.channelId);

      if (!currentRedemptionType) {
        const [channel] = await tx
          .select({ name: redemptionChannels.description })
          .from(redemptionChannels)
          .where(eq(redemptionChannels.id, requestedChannelId))
          .limit(1);

        if (channel?.name) {
          currentRedemptionType = channel.name;
        }
      }
      const isAllowedById = allowedChannelIds.includes(requestedChannelId);
      // const isAllowedById = allowedChannelIds.includes(requestedChannelId) || this.ip === 'internal' || validated.redemptionType === 'MARKETPLACE';
      if (!isAllowedById) {
        throw new AppError(
          `Redemption through channel ${requestedChannelId} (${currentRedemptionType || 'unknown'}) is not allowed for ${userRole} profile.`,
          403
        );
      }

      // 2. Determine Table and Fetch Balance based on user role
      let pointsBalance = 0;
      let ledgerTable: typeof retailerLedger | typeof electricianLedger | typeof counterSalesLedger;
      let targetTable: typeof retailers | typeof electricians | typeof counterSales | null = null;
      let userIdCol: any = null;

      if (userWithRole.roleName === 'Retailer') {
        targetTable = retailers;
        userIdCol = retailers.userId;
        ledgerTable = retailerLedger;
      } else if (userWithRole.roleName === 'Electrician') {
        targetTable = electricians;
        userIdCol = electricians.userId;
        ledgerTable = electricianLedger;
      } else if (userWithRole.roleName === 'CounterSales' || userWithRole.roleName === 'Counter Staff') {
        targetTable = counterSales;
        userIdCol = counterSales.userId;
        ledgerTable = counterSalesLedger;
      }

      if (!targetTable || !userIdCol) {
        throw new AppError('User role cannot redeem points', 400);
      }

      if (targetTable && userIdCol) {
        const [userDetails] = await tx.select().from(targetTable).where(eq(userIdCol, this.userId!)).limit(1);
        if (!userDetails) {
          throw new AppError('User details not found for redemption', 404);
        }
        if (validated.redemptionType === 'UPI' && !userDetails.upiId) {
          throw new AppError('UPI ID not found for redemption', 400);
        }
        if (validated.redemptionType === 'BANK_TRANSFER' && !userDetails.isBankValidated) {
          throw new AppError('Bank details not found for redemption', 400);
        }
      }

      // For retailer/electrician/counter staff roles
      if (targetTable && userIdCol) {
        const [balanceRecord] = await tx
          .select({ pointsBalance: targetTable.redeemablePoints })
          .from(targetTable)
          .where(eq(userIdCol, this.userId!));

        pointsBalance = Number(balanceRecord?.pointsBalance || 0);

        if (pointsBalance < validated.pointsRedeemed) {
          await this.emitEvent('REDEMPTION_REJECTED', undefined, { reason: 'Insufficient balance' });
          throw new AppError('Insufficient points', 400);
        }
      }

      // 3. Check if redemption requires approval
      // const approvalCheck = await approvalService.checkRedemptionApproval(
      //   this.userId!,
      //   validated.pointsRedeemed,
      //   validated.redemptionType || 'STANDARD',
      //   userRole
      // );
      const redemptionId = validated.orderId
        ? `ORDER-${validated.orderId}`
        : `RED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (validated.orderId) {
        const [existingRedemption] = await tx
          .select()
          .from(redemptions)
          .where(eq(redemptions.redemptionId, redemptionId))
          .limit(1);
        if (existingRedemption) {
          throw new AppError('Redemption already exists for this order', 400);
        }
      }
      const metadata = {
        ...validated.metadata,
        redemptionType: validated.redemptionType,
        orderId: validated.orderId,
        items: validated.items,
        requestedAt: new Date().toISOString(),
        requestedBy: this.userId,
        userRole: userRole,
        ip: this.ip,
        userAgent: this.userAgent,
        //requiresApproval: approvalCheck.requiresApproval,
        //flaggedReasons: approvalCheck.flaggedReasons,
      };

      // 4. Determine initial status based on approval requirement
      let initialStatus = 'Pending';
      // if (approvalCheck.requiresApproval) {
      //   initialStatus = 'Pending';
      // } else {
      //   initialStatus = validated.redemptionType === 'PHYSICAL_REWARD' ? 'Pending' : 'Approved';
      // }

      const [status] = await tx.select().from(redemptionStatuses).where(eq(redemptionStatuses.name, initialStatus));

      if (!status) {
        throw new AppError(`Invalid redemption status: ${initialStatus}`, 500);
      }

      // 5. Create redemption record
      const [newRedemption] = await tx.insert(redemptions).values({
        userId: this.userId!,
        redemptionId,
        channelId: validated.channelId,
        pointsRedeemed: validated.pointsRedeemed,
        amount: validated.amount,
        status: status.id,
        channelReferenceId: validated.channelReferenceId,
        metadata,
      }).returning();

      let approvalId: number | undefined;
      let message = '';

      // 6. Handle Razorpay payout for UPI and BANK_TRANSFER redemptions
      if (validated.redemptionType === 'UPI' || validated.redemptionType === 'BANK_TRANSFER') {
        try {
          // Get user details including bank/UPI information
          const [userDetails] = await tx.select().from(targetTable!).where(eq(userIdCol, this.userId!));

          if (!userDetails) {
            throw new AppError('User details not found for payout', 404);
          }

          // Prepare Razorpay payout request
          let payoutRequest: PayoutRequest;

          if (validated.redemptionType === 'UPI') {
            if (!userDetails.upiId) {
              throw new AppError('UPI ID not found. Please update your profile.', 400);
            }

            // Create UPI fund account record
            const upiRecord = await redemptionService.createUpiRecord({
              redemptionId: newRedemption.id,
              upiId: userDetails.upiId,
            }, tx);

            // Update channel reference
            await redemptionService.updateChannelReferenceId(newRedemption.id, upiRecord.id, tx);

            // Build UPI payout request
            payoutRequest = {
              amount: Math.round((validated.amount || 0) * 100), // Convert to paise
              mode: 'UPI',
              purpose: 'refund',
              fundAccount: {
                accountType: 'vpa',
                vpa: { address: userDetails.upiId },
                contact: {
                  name: userDetails.name || 'User',
                  email: userDetails.email || '',
                  contact: userDetails.phone || '',
                  type: 'customer',
                  referenceId: String(newRedemption.id),
                },
              },
              referenceId: String(newRedemption.id),
              narration: `Redemption ${redemptionId}`,
              notes: {
                redemptionId,
                userId: String(this.userId),
                type: 'UPI',
              },
            };
          } else {
            // BANK_TRANSFER
            if (!userDetails.isBankValidated) {
              throw new AppError('Bank details not validated. Please complete KYC.', 400);
            }

            // Create bank transfer fund account record
            const bankRecord = await redemptionService.createBankTransferRecord({
              redemptionId: newRedemption.id,
              accountHolderName: userDetails.bankAccountName || userDetails.name || 'User',
              accountNumber: userDetails.bankAccountNo || '',
              ifscCode: userDetails.bankAccountIfsc || '',
            }, tx);

            // Update channel reference
            await redemptionService.updateChannelReferenceId(newRedemption.id, bankRecord.id, tx);

            // Build bank transfer payout request
            payoutRequest = {
              amount: Math.round((validated.amount || 0) * 100), // Convert to paise
              mode: 'NEFT',
              purpose: 'payout',
              fundAccount: {
                accountType: 'bank_account',
                bankAccount: {
                  accountNumber: userDetails.bankAccountNo || '',
                  ifscCode: userDetails.bankAccountIfsc || '',
                  accountHolderName: userDetails.bankAccountName || userDetails.name || 'User',
                },
                contact: {
                  name: userDetails.name || 'User',
                  email: userDetails.email || '',
                  contact: userDetails.phone || '',
                  type: 'customer',
                  referenceId: String(newRedemption.id),
                },
              },
              referenceId: String(newRedemption.id),
              narration: `Redemption ${redemptionId}`,
              notes: {
                redemptionId,
                userId: String(this.userId),
                type: 'BANK_TRANSFER',
              },
            };
          }

          // Call Razorpay Payout API
          const payoutResponse = await razorpayService.createPayout(payoutRequest, newRedemption.id, tx);
          await tx
            .update(targetTable!)
            .set({
              pointsBalance: sql`points_balance - ${validated.pointsRedeemed}`,
              totalBalance: sql`total_balance - ${validated.pointsRedeemed}`,
              redeemablePoints: sql`redeemable_points - ${validated.pointsRedeemed}`,
              totalRedeemed: sql`total_redeemed + ${validated.pointsRedeemed}`,
            })
            .where(eq(userIdCol, this.userId!));

          // Update redemption with payout ID and set status to PROCESSING
          const [processingStatus] = await tx
            .select()
            .from(redemptionStatuses)
            .where(eq(redemptionStatuses.name, 'Processing'));

          if (processingStatus) {
            await tx.update(redemptions)
              .set({
                status: processingStatus.id,
                metadata: {
                  ...metadata,
                  razorpayPayoutId: payoutResponse.id,
                  razorpayFundAccountId: payoutResponse.fund_account_id,
                  payoutStatus: payoutResponse.status,
                  payoutInitiatedAt: new Date().toISOString(),
                },
                updatedAt: new Date(),
              })
              .where(eq(redemptions.id, newRedemption.id));
          }

          // Update channel-specific record with payout details
          if (validated.redemptionType === 'UPI') {
            await redemptionService.updateUpiPayout(newRedemption.id, {
              razorpayPayoutId: payoutResponse.id,
              razorpayFundAccountId: payoutResponse.fund_account_id,
            });
          } else {
            await redemptionService.updateBankTransferPayout(newRedemption.id, {
              razorpayPayoutId: payoutResponse.id,
              razorpayFundAccountId: payoutResponse.fund_account_id,
            });
          }

          message = `Payout initiated for ${validated.redemptionType}. Processing in progress. You will receive confirmation via email/SMS.`;

          await this.emitEvent('PAYOUT_INITIATED', newRedemption.id, {
            redemptionId,
            payoutId: payoutResponse.id,
            amount: validated.amount,
            type: validated.redemptionType,
          });
        } catch (error) {
          // If payout fails, mark redemption as FAILED and refund points
          const [failedStatus] = await tx
            .select()
            .from(redemptionStatuses)
            .where(eq(redemptionStatuses.name, 'Failed'));

          if (failedStatus) {
            await tx.update(redemptions)
              .set({
                status: failedStatus.id,
                metadata: {
                  ...metadata,
                  payoutError: (error as any).message || 'Payout failed',
                  failedAt: new Date().toISOString(),
                },
                updatedAt: new Date(),
              })
              .where(eq(redemptions.id, newRedemption.id));
          }

          await this.emitEvent('PAYOUT_FAILED', newRedemption.id, {
            redemptionId,
            error: (error as any).message,
            type: validated.redemptionType,
          });

          throw error;
        }
      } else if (validated.redemptionType === 'E_VOUCHER') {
        // 7. Handle E-Voucher details
        if (validated.items && validated.items.length > 0) {
          for (const item of validated.items) {
            await tx.insert(redemptionVouchers).values({
              redemptionId: newRedemption.id,
              voucherCode: String(item.code || 'NA'),
              voucherPin: item.pin ? String(item.pin) : null,
              platformVoucherId: item.txnId ? String(item.txnId) : (item.id ? String(item.id) : null),
              platformOrderId: validated.orderId,
              brand: item.brandName || item.brand,
              denomination: String(item.rate || 0),
              validUntil: item.expiryDate || item.validUntil,
              txnId: item.txnId ? String(item.txnId) : null,
              voucherName: item.voucherName ? String(item.voucherName) : null,
              rate: item.rate ? String(item.rate) : "0",
              qty: item.qty ? Number(item.qty) : 1,
              status: item.status ? String(item.status) : null,
              txnTime: item.txnTime ? String(item.txnTime) : null,
            });
          }
        }
        await tx
          .update(targetTable!)
          .set({
            pointsBalance: sql`points_balance - ${validated.pointsRedeemed}`,
            totalBalance: sql`total_balance - ${validated.pointsRedeemed}`,
            redeemablePoints: sql`redeemable_points - ${validated.pointsRedeemed}`,
            totalRedeemed: sql`total_redeemed + ${validated.pointsRedeemed}`,
          })
          .where(eq(userIdCol, this.userId!));
        message = 'Voucher redemption processed successfully';
      } else {
        // For non-payout redemptions (PHYSICAL_REWARD, MARKETPLACE)
        await tx
          .update(targetTable!)
          .set({
            pointsBalance: sql`points_balance - ${validated.pointsRedeemed}`,
            totalBalance: sql`total_balance - ${validated.pointsRedeemed}`,
            redeemablePoints: sql`redeemable_points - ${validated.pointsRedeemed}`,
            totalRedeemed: sql`total_redeemed + ${validated.pointsRedeemed}`,
          })
          .where(eq(userIdCol, this.userId!));
        message = 'Redemption processed successfully';
      }

      return {
        success: true,
        redemptionId,
        message,
        approvalId,
      };
    });
  }
}
