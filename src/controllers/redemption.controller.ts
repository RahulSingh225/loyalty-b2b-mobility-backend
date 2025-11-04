import { Request, Response } from 'express';
import { RedemptionProcedure } from '../procedures/redemption';
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
