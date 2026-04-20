import { Request, Response } from 'express';
import { razorpayService, PayoutResponse } from '../services/razorpayService';
import { redemptionService } from '../services/redemptionService';
import { AppError } from '../middlewares/errorHandler';
import { db } from '../config/db';
import { redemptions, redemptionStatuses } from '../schema';
import { eq, sql } from 'drizzle-orm';
import { BUS_EVENTS, publish } from '../mq/mqService';

// ============================================================================
// Types
// ============================================================================

interface WebhookPayout {
  entity: PayoutResponse;
}

interface WebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payout?: WebhookPayout;
    transaction?: {
      entity: any;
    };
  };
  created_at: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status ID by name from database
 */
async function getStatusIdByName(statusName: string): Promise<number | null> {
  const [result] = await db
    .select({ id: redemptionStatuses.id })
    .from(redemptionStatuses)
    .where(sql`lower(${redemptionStatuses.name}) = lower(${statusName})`)
    .execute();

  return result?.id || null;
}

/**
 * Extract redemption ID from payout reference ID
 * Format: "redemption_<id>" or just "<id>"
 */
function extractRedemptionId(referenceId: string | null): number | null {
  if (!referenceId) return null;
  const match = referenceId.match(/^(?:redemption_)?(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Find redemption by Razorpay payout ID in metadata
 */
async function findRedemptionByPayoutId(payoutId: string): Promise<any | null> {
  const [result] = await db
    .select()
    .from(redemptions)
    .where(sql`metadata->>'razorpayPayoutId' = ${payoutId}`)
    .limit(1)
    .execute();

  return result || null;
}

/**
 * Mark webhook as processed to prevent duplicate handling
 * Note: We check if the same event for the same payout ID was already processed
 */
async function isWebhookProcessed(payoutId: string, eventType: string): Promise<boolean> {
  // We check against third_party_api_logs to see if we already handled this webhook
  // Or we could check redemption metadata, but logs are more reliable for history
  const [result] = await db
    .select({ id: redemptions.id })
    .from(redemptions)
    .where(sql`metadata->>'razorpayPayoutId' = ${payoutId} AND metadata->>'lastWebhookEvent' = ${eventType}`)
    .execute();

  return !!result;
}

// ============================================================================
// Webhook Handlers
// ============================================================================

/**
 * Common handler logic for payout webhooks
 */
const handlePayoutWebhook = async (req: Request, res: Response, eventType: string) => {
  const payload: WebhookPayload = req.body;
  const signature = req.headers['x-razorpay-signature'] as string;

  try {
    // 1. Verify signature
    const payloadString = JSON.stringify(payload);
    const isValid = razorpayService.verifyWebhookSignature(payloadString, signature);

    if (!isValid) {
      console.warn(`[Webhook] Invalid signature for ${eventType}`);
      await razorpayService.logWebhook({
        eventType,
        payload,
        signature,
        isSuccess: false,
        errorMessage: 'Invalid signature',
      });
      return res.status(401).json({ success: false, error: { message: 'Invalid signature' } });
    }

    const payoutEntity = payload.payload.payout?.entity;
    if (!payoutEntity) {
      console.warn(`[Webhook] Missing payout entity in ${eventType} payload`);
      return res.status(400).json({ success: false, error: { message: 'Missing payout entity' } });
    }

    // 2. Identify Redemption
    let redemptionId = extractRedemptionId(payoutEntity.reference_id);
    let redemption: any = null;

    if (redemptionId) {
      [redemption] = await redemptionService.findOne({ id: redemptionId });
    }

    if (!redemption) {
      // Fallback: search by payout ID in metadata
      redemption = await findRedemptionByPayoutId(payoutEntity.id);
      if (redemption) {
        redemptionId = redemption.id;
      }
    }

    if (!redemption) {
      console.warn(`[Webhook] Redemption not found for payout ${payoutEntity.id} (ref: ${payoutEntity.reference_id})`);
      // We acknowledge anyway to stop Razorpay from retrying indefinitely if it's a legitimate "not found"
      return res.status(200).json({ success: true, message: 'Redemption not found' });
    }

    // 3. Mark processed
    if (await isWebhookProcessed(payoutEntity.id, eventType)) {
      console.log(`[Webhook] Duplicate ${eventType} for redemption:`, redemptionId);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // 4. Handle specific event logic
    let statusToSet: string | null = null;
    let shouldRefund = false;
    let eventMessage: string | null = null;
    let updateMetadata: any = {
      razorpayPayoutId: payoutEntity.id,
      razorpayFundAccountId: payoutEntity.fund_account_id,
      lastWebhookEvent: eventType,
      lastWebhookProcessedAt: new Date().toISOString(),
    };

    if (payoutEntity.utr) {
      updateMetadata.utr = payoutEntity.utr;
    }

    // Map Razorpay status/event to our internal status
    switch (eventType) {
      case 'payout.initiated':
        statusToSet = 'Processing';
        eventMessage = BUS_EVENTS.REDEMPTION_REQUEST;
        break;

      case 'payout.updated':
        if (payoutEntity.status === 'processed') {
          statusToSet = 'Completed';
          eventMessage = BUS_EVENTS.REDEMPTION_APPROVE;
        } else if (payoutEntity.status === 'processing') {
          statusToSet = 'Processing';
        } else if (payoutEntity.status === 'reversed') {
          statusToSet = 'Failed';
          shouldRefund = true;
          eventMessage = BUS_EVENTS.REDEMPTION_REJECT;
        }
        break;

      case 'payout.processed':
        statusToSet = 'Completed';
        updateMetadata.processedAt = new Date().toISOString();
        eventMessage = BUS_EVENTS.REDEMPTION_APPROVE;
        break;

      case 'payout.failed':
        statusToSet = 'Failed';
        shouldRefund = true;
        updateMetadata.failureReason = payoutEntity.failure_reason;
        eventMessage = BUS_EVENTS.REDEMPTION_REJECT;
        break;

      case 'payout.reversed':
        statusToSet = 'Failed';
        shouldRefund = true;
        updateMetadata.failureReason = payoutEntity.failure_reason || 'Payout reversed by Razorpay';
        eventMessage = BUS_EVENTS.REDEMPTION_REJECT;
        break;

      case 'payout.rejected':
        statusToSet = 'Rejected';
        shouldRefund = true;
        updateMetadata.failureReason = payoutEntity.failure_reason;
        eventMessage = BUS_EVENTS.REDEMPTION_REJECT;
        break;
    }

    // 5. Update Database
    if (statusToSet) {
      const statusId = await getStatusIdByName(statusToSet);
      if (statusId) {
        // Merge with existing metadata
        const currentMetadata = redemption.metadata || {};
        const mergedMetadata = { ...currentMetadata, ...updateMetadata };

        await redemptionService.updateRedemptionStatus(redemptionId!, statusId, mergedMetadata);
        if (eventMessage) {
          await publish(eventMessage, {
            redemptionId: redemptionId,
            status: statusToSet,
            metadata: mergedMetadata,
          });
        }
        // Update channel-specific records if UTR is available
        if (payoutEntity.utr) {
          if (payoutEntity.notes.type === 'UPI') { // UPI
            await redemptionService.updateUpiPayout(redemptionId!, {
              razorpayPayoutId: payoutEntity.id,
              utr: payoutEntity.utr,
              processedAt: updateMetadata.processedAt
            });
          } else if (payoutEntity.notes.type === 'BANK_TRANSFER') { // Bank Transfer
            await redemptionService.updateBankTransferPayout(redemptionId!, {
              razorpayPayoutId: payoutEntity.id,
              utr: payoutEntity.utr,
              processedAt: updateMetadata.processedAt
            });
          }
        }
      }
    }

    // 6. Handle Refund
    if (shouldRefund) {
      await redemptionService.refundPoints(
        redemptionId!,
        redemption.userId,
        Number(redemption.pointsRedeemed),
        updateMetadata.failureReason || 'Payout failed'
      );
    }

    // 7. Log Webhook
    await razorpayService.logWebhook({
      redemptionId: redemptionId!,
      eventType,
      payload,
      signature,
      isSuccess: true,
    });

    console.log(`[Webhook] ✓ ${eventType} handled for redemption:`, redemptionId);
    res.status(200).json({ success: true, message: `Event ${eventType} handled` });

  } catch (error) {
    console.error(`[Webhook] Error handling ${eventType}:`, error);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

/**
 * Generic webhook handler that routes to specific handlers
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const payload = req.body as WebhookPayload;
  const event = payload.event;

  if (!req.headers['x-razorpay-signature']) {
    console.warn('[Webhook] Missing X-Razorpay-Signature header');
    return res.status(401).json({ success: false, error: { message: 'Missing signature' } });
  }

  console.log(`[Webhook] Received event: ${event}`);

  // Route based on event type
  if (event.startsWith('payout.')) {
    return handlePayoutWebhook(req, res, event);
  } else if (event === 'transaction.created') {
    // We log transaction events but they usually don't trigger state changes 
    // as payout events are more descriptive for our business logic
    await razorpayService.logWebhook({
      eventType: event,
      payload,
      signature: req.headers['x-razorpay-signature'] as string,
      isSuccess: true,
    });
    return res.status(200).json({ success: true, message: 'Transaction logged' });
  } else {
    console.log('[Webhook] Unhandled event type:', event);
    return res.status(200).json({ success: true, message: 'Event acknowledged' });
  }
};

