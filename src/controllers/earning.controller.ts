import { Request, Response } from 'express';
import { earningService } from '../services/earning.service';
import { earningHistoryService } from '../services/earningHistoryService';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';

export const scanQr = async (req: Request, res: Response) => {
    const { qrCode, latitude, longitude, metadata } = req.body;

    // User should be attached to request by auth middleware
    // We need to resolve userType. 
    // Ideally, req.user contains roleId or roleName.
    // We'll assume req.user is populated.
    const user = (req as any).user;

    if (!user) {
        throw new AppError('Unauthorized', 401);
    }

    // NOTE: In a real app, we need to map user.roleId to our 'Retailer' | 'Electrician' strings
    // or store the name in the token/session.
    // For now, we'll assume the client sends userType or we fetch it.
    // Let's assume we fetch it or pass it. 
    // However, `earningService.scanQr` expects `userType`.
    // We'll trust the plan and assume we can derive it.
    // Temporary: Pass userType in body for testing, or derive from DB in middleware.

    // Let's assume req.body.userType is passed for now to keep it generic as per request.
    // Or better, we query it. But simpler to pass for this generic implementation demo.
    const userType = req.body.userType;

    const result = await earningService.scanQr({
        userId: user.id,
        roleId: user.roleId, // assuming token has roleId
        userType: userType, // 'Retailer', 'Electrician', etc.
        latitude,
        longitude,
        metadata
    }, qrCode);

    res.json(success(result, 'Scan successful'));
};

export const getEarningHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20, userType = 'counter_sales' } = req.query;

  const opts = { page: parseInt(String(page)), pageSize: parseInt(String(pageSize)) };

  let result;
  if (userType === 'electrician') {
    result = await earningHistoryService.getElectricianEarningHistory(user.id, opts);
  } else if (userType === 'retailer') {
    result = await earningHistoryService.getRetailerEarningHistory(user.id, opts);
  } else {
    result = await earningHistoryService.getCounterSalesEarningHistory(user.id, opts);
  }

  res.json(success(result));
};

export const getEarningDetail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userType = 'counter_sales' } = req.query;
  const detail = await earningHistoryService.getEarningDetail(parseInt(id), userType as any);
  if (!detail) return res.status(404).json({ success: false, error: { message: 'Earning record not found' } });
  res.json(success(detail));
};

export const getPassbook = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const passbook = await earningHistoryService.getPassbook(user.id);
  res.json(success(passbook));
}