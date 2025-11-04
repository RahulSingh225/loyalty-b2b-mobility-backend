import { Request, Response } from 'express';
import { KycApproveProcedure } from '../procedures/kyc-approve';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';

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
