import { Request, Response } from 'express';
import { QrScanProcedure } from '../procedures/qr-scan';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';

export const scanQr = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const procedure = new QrScanProcedure(req.body).setContext(user.id, req.ip, req.get('User-Agent') || '', { path: req.path });

  try {
    const result = await procedure.execute();
    res.json(success(result, undefined, procedure.correlationId));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Scan failed', 500);
  }
};
