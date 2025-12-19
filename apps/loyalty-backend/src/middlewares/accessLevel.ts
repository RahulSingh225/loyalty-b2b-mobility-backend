// src/middlewares/accessLevelMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { cacheMaster } from '../utils/masterCache';
import * as schema from '../schema';
import { AppError } from './errorHandler';
import db from '../config/db';

declare global {
  namespace Express {
    interface Request {
      accessLevel?: number;
      accessType?: string;
    }
  }
}

export const accessLevelMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user?.userType) return next(); // public route

    const levels = await cacheMaster('userTypes', async () => db.select().from(schema.userTypeEntity).execute());

    const entry = levels.find((l) => l.typeName === user.userType);
    if (!entry) {
      throw new AppError(`Invalid accessType: ${user.userType}`, 403);
    }

    req.accessLevel = entry.levelId;
    req.accessType = entry.accessType;

    next();
  } catch (err) {
    next(err);
  }
};