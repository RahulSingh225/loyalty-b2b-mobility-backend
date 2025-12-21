// Profile endpoints merged from profile.controller.ts
export const getProfile = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const profile = await userService.getProfile(user.id);
  res.json(success(profile));
};

export const updateProfile = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const updates = req.body;
  const updated = await userService.updateProfile(user.id, updates);
  res.json(success(updated));
};
import { Request, Response } from 'express';
import { KycApproveProcedure } from '../procedures/kyc-approve';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';
import { userService } from '../services/userService';

export const approveKyc = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const procedure = new KycApproveProcedure(req.body).setContext(user.id, req.ip, req.get('User-Agent') || '');

  try {
    const result = await procedure.execute();
    res.json(success(result));
  } catch (err) {
    throw err instanceof AppError ? err : new AppError('Approval failed', 500);
  }
};

export const getReferralsHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20 } = req.query;

  const opts = { page: parseInt(String(page)), pageSize: parseInt(String(pageSize)) };

  const result = await userService.getReferralsHistory(user.id, opts);

  res.json(success(result));
}


