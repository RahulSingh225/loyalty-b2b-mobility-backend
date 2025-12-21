import { Request, Response } from 'express';
import { RedemptionProcedure } from '../procedures/redemption';
import { redemptionService } from '../services/redemptionService';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';

export const requestRedemption = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const procedure = new RedemptionProcedure(req.body).setContext(user.id, req.ip, req.get('User-Agent') || '');

  try {
    const result = await procedure.execute();
    res.json(success(result));
  } catch (err) {
    throw err instanceof AppError ? err : new AppError('Redemption failed', 500);
  }
};

export const getRedemptionHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20, status } = req.query;

  const opts = { page: parseInt(String(page)), pageSize: parseInt(String(pageSize)) };

  let result;
  if (status) {
    result = await redemptionService.getRedemptionHistoryByStatus(user.id, parseInt(String(status)), opts);
  } else {
    result = await redemptionService.getRedemptionHistory(user.id, opts);
  }

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
