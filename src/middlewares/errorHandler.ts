import { Request, Response, NextFunction } from 'express';
import { logSystemError } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = async (err: Error, req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id']?.toString() || uuidv4();

  if (err instanceof AppError) {
    await logSystemError(err.message, correlationId, (req as any).user?.id, req.ip, req.get('User-Agent'));
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, correlationId },
      code: err.statusCode,
    });
  }

  console.error('UNHANDLED ERROR:', err);
  await logSystemError('Internal server error', correlationId, (req as any).user?.id, req.ip, req.get('User-Agent'));
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error', correlationId },
    code: 500,
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
