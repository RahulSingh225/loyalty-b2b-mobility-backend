import { Request, Response } from 'express';
import { RedemptionProcedure } from '../procedures/redemption';
import { redemptionService } from '../services/redemptionService';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';
import { db } from '../config/db';
import { redemptionChannels, redemptionStatuses } from '../schema';
import { eq } from 'drizzle-orm';

export const requestRedemption = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const procedure = new RedemptionProcedure(req.body).setContext(user.id, req.ip, req.get('User-Agent') || '');

  try {
    const result = await procedure.execute();
    res.json(success(result));
  } catch (err) {
    console.log(err);
    throw err instanceof AppError ? err : new AppError('Redemption failed', 500);
  }
};

export const placeOrder = async (req: Request, res: Response) => {

  const channelPartner = req.headers['x-channel-partner'];
  const apiKey = req.headers['x-api-key'];

  if (channelPartner !== 'GYFTR' || apiKey !== process.env.GYFTR_API_KEY) {
    console.log(channelPartner,apiKey)
    console.log(process.env.GYFTR_API_KEY)
    console.log("FASAA")
    return res.status(401).json({
      status: 'error',
      code: '401',
      message: 'Unauthorized',
    });
  }
  const { totalCartValue, orderId, userId, itemDetails } = req.body;
  const user = (req as any).user;
  if (userId != user.id) {
    console.log("FASSA2",user.id,userId)
    return res.status(401).json({
      status: 'error',
      code: '401',
      message: 'Unauthorized',
    });
  }

  // Validate cart value matches item details
  if (!itemDetails || itemDetails.length === 0) {
    return res.status(400).json({
      status: 'error',
      code: '400',
      message: 'Item details are required',
      orderId,
      userId,
    });
  }

  const calculatedTotal = itemDetails.reduce((sum, item) => {
    const rate = Number(item.rate) || 0;
    const qty = Number(item.qty) || 1;
    return sum + (rate * qty);
  }, 0);

  if (calculatedTotal !== totalCartValue) {
    return res.status(400).json({
      status: 'error',
      code: '400',
      message: `Cart value mismatch: expected ${calculatedTotal}, received ${totalCartValue}`,
      orderId,
      userId,
      expectedTotal: calculatedTotal,
      receivedTotal: totalCartValue,
    });
  }

  // 1. Lookup for description = 'VOUCHER' in redemption_channels table
  const [channel] = await db
    .select()
    .from(redemptionChannels)
    .where(eq(redemptionChannels.description, 'VOUCHER'))
    .limit(1);

  if (!channel) {
    return res.status(500).json({
      status: 'error',
      code: '500',
      message: 'Redemption channel not found',
      orderId,
      userId,
    });
  }

  // 2. Prepare procedure input
  const input = {
    channelId: channel.id,
    pointsRedeemed: totalCartValue,
    orderId: orderId,
    items: itemDetails,
    metadata: {
      originalUserId: userId,
    },
    redemptionType: 'E_VOUCHER' as const,
  };

  const procedure = new RedemptionProcedure(input).setContext(
    user.id,
    req.ip,
    req.get('User-Agent') || ''
  );

  try {
    const result = await procedure.execute();

    if (result.success) {
      return res.json({
        status: 'success',
        code: '100',
        orderId,
        refId: result.redemptionId,
        userId,
      });
    } else {
      return res.status(400).json({
        status: 'failed',
        code: '101',
        message: result.message,
        orderId,
        userId,
      });
    }
  } catch (err: any) {
    console.error('Gyftr placeOrder failed:', err);
    const message = err.message || 'Internal error';
    return res.status(500).json({
      status: 'error',
      code: '500',
      message,
      orderId,
      userId,
    });
  }
};

export const getRedemptionHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20, status, fromDate, toDate } = req.query;

  const opts = {
    page: parseInt(String(page)),
    pageSize: parseInt(String(pageSize)),
    status: status ? String(status) : undefined,
    fromDate: fromDate ? String(fromDate) : undefined,
    toDate: toDate ? String(toDate) : undefined
  };

  const result = await redemptionService.getRedemptionHistory(user.id, opts);

  res.json(success(result));
};

export const getRedemptionDetail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const redemption = await redemptionService.getRedemptionDetail(parseInt(id));
  if (!redemption) return res.status(404).json({ success: false, error: { message: 'Redemption not found' } });
  res.json(success(redemption));
};

export const getRedemptionStats = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const stats = await redemptionService.getUserRedemptionStats(user.id);
  res.json(success(stats));
};

export const getRedemptionTypes = async (req: Request, res: Response) => {
  const channels = await db.select().from(redemptionChannels).orderBy(redemptionChannels.name).execute();
  const statuses = await db.select().from(redemptionStatuses).orderBy(redemptionStatuses.name).execute();
  res.json(success({ channels, statuses }));
};

export const orderStatus = async (req: Request, res: Response) => {
  const channelPartner = req.headers['x-channel-partner'];
  const apiKey = req.headers['x-api-key'];

  if (channelPartner !== 'GYFTR' || apiKey !== process.env.GYFTR_API_KEY) {
    return res.status(401).json({
      status: 'error',
      code: '401',
      message: 'Unauthorized',
    });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({
      status: 'error',
      code: '400',
      message: 'orderId is required',
    });
  }

  try {
    const vouchers = await redemptionService.getVoucherDetailsByPlatformOrderId(String(orderId));

    if (!vouchers || vouchers.length === 0) {
      return res.status(404).json({
        status: 'failed',
        code: '404',
        message: 'Order not found',
        orderId,
      });
    }

    const { refId, orderId: platformOrderId } = vouchers[0];

    const itemDetails = vouchers.map((v) => ({
      txnId: v.txnId,
      voucherName: v.voucherName,
      rate: v.rate ? Number(v.rate) : 0,
      qty: v.qty,
      status: v.status,
      txnTime: v.txnTime,
    }));

    return res.json({
      status: 'success',
      code: '200',
      refId,
      orderId: platformOrderId,
      itemDetails,
    });
  } catch (err: any) {
    console.error('Gyftr orderStatus failed:', err);
    return res.status(500).json({
      status: 'error',
      code: '500',
      message: err.message || 'Internal error',
      orderId,
    });
  }
};
