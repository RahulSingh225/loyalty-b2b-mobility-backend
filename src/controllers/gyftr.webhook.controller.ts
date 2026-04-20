import { Request, Response } from 'express';
import { db } from '../config/db';
import { redemptions, redemptionStatuses, redemptionVouchers, users } from '../schema';
import { eq, sql, and } from 'drizzle-orm';
import { redemptionService } from '../services/redemptionService';

export const handleGyftrWebhook = async (req: Request, res: Response) => {
    const channelPartner = req.headers['x-channel-partner'];
    const apiKey = req.headers['x-api-key'];

    if (channelPartner !== 'GYFTR' || apiKey !== process.env.GYFTR_API_KEY) {
        return res.status(401).json({
            status: 'error',
            code: '401',
            message: 'Unauthorized',
        });
    }

    const { userId: gyftrUserId, orderId, orderStatus, itemDetails } = req.body;

    try {
        // 1. Lookup redemption and associated user/status
        const results = await db
            .select({
                redemption: redemptions,
                user: users,
                status: redemptionStatuses
            })
            .from(redemptions)
            .innerJoin(users, eq(redemptions.userId, users.id))
            .innerJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id))
            .innerJoin(redemptionVouchers, eq(redemptions.id, redemptionVouchers.redemptionId))
            .where(eq(redemptionVouchers.platformOrderId, orderId))
            .limit(1);

        if (!results || results.length === 0) {
            return res.status(404).json({
                status: 'error',
                code: '404',
                message: 'Order not found',
                orderId,
            });
        }

        const { redemption, user, status } = results[0];

        // Check if redemption is already in a terminal state
        const currentStatus = status.name?.toLowerCase();
        if (currentStatus === 'completed' || currentStatus === 'refunded') {
            return res.status(200).json({
                status: 'success',
                code: '200',
                message: 'order already settled',
                orderId
            });
        }

        // 2. Map redemption status
        let targetStatusName = '';
        if (orderStatus === 'C') {
            targetStatusName = 'Completed';
        } else if (orderStatus === 'R') {
            targetStatusName = 'Failed';
        }

        if (targetStatusName) {
            const [statusRecord] = await db
                .select()
                .from(redemptionStatuses)
                .where(sql`lower(${redemptionStatuses.name}) = lower(${targetStatusName})`)
                .limit(1);

            if (statusRecord) {
                await redemptionService.updateRedemptionStatus(redemption.id, statusRecord.id);
            }
        }

        // 3. Process itemDetails
        const processedItemDetails = [];
        for (const item of itemDetails) {
            const { txnId, status: itemStatus } = item;

            // Find the specific voucher row
            const [voucherRow] = await db
                .select()
                .from(redemptionVouchers)
                .where(and(
                    eq(redemptionVouchers.redemptionId, redemption.id),
                    eq(redemptionVouchers.txnId, txnId)
                ))
                .limit(1);

            if (voucherRow) {
                // Update status in redemption_vouchers
                const dbStatus = itemStatus === 'C' ? 'Completed' : (itemStatus === 'R' ? 'Refunded' : itemStatus);
                await redemptionService.updateVoucherStatus(voucherRow.id, dbStatus);

                // Handle refund if item status is 'R'
                if (itemStatus === 'R') {
                    const refundPoints = Number(voucherRow.rate || 0) * Number(voucherRow.qty || 1);
                    if (refundPoints > 0) {
                        await redemptionService.refundVoucherPoints(
                            redemption.id,
                            refundPoints,
                            `Gyftr Webhook Refund for Item ${txnId}`
                        );
                    }
                }

                processedItemDetails.push({
                    txnId: voucherRow.txnId,
                    voucherName: voucherRow.voucherName,
                    rate: Number(voucherRow.rate || 0),
                    qty: Number(voucherRow.qty || 1),
                    status: itemStatus
                });
            }
        }

        // 4. Send response
        return res.json({
            status: 'success',
            code: '200',
            refId: redemption.redemptionId,
            orderId: orderId,
            orderStatus: orderStatus,
            userId: gyftrUserId,
            mobileNumber: user.phone,
            totalCartValue: Number(redemption.pointsRedeemed),
            itemDetails: processedItemDetails
        });

    } catch (err: any) {
        console.error('Gyftr webhook failed:', err);
        return res.status(500).json({
            status: 'error',
            code: '500',
            message: err.message || 'Internal error',
            orderId,
        });
    }
};
