import { Request, Response } from 'express';
import { earningService } from '../services/earning.service';
import { earningHistoryService } from '../services/earningHistoryService';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';
import { ScanQrSchema } from '../middlewares/zod';
import db from '../config/db';
import { userTypeEntity } from '../schema';
import { eq } from 'drizzle-orm';
import { UserType } from '../types';

export const scanQr = async (req: Request, res: Response) => {
  // Validate request body with Zod schema
  const { qrCode, latitude, longitude, metadata } = ScanQrSchema.parse(req.body);

  // User should be attached to request by auth middleware
  const user = (req as any).user;

  if (!user) {
    throw new AppError('Unauthorized', 401);
  }

  if (!user.roleId) {
    throw new AppError('User role not found', 400);
  }

  // Fetch user type from database using roleId
  const [userRole] = await db
    .select({ typeName: userTypeEntity.typeName })
    .from(userTypeEntity)
    .where(eq(userTypeEntity.id, user.roleId))
    .limit(1);

  if (!userRole || !userRole.typeName) {
    throw new AppError('User role type not found', 400);
  }

  // Map database typeName to UserType
  // The typeName in DB might be different from the UserType enum
  // Common mappings: 'retailer' -> 'Retailer', 'electrician' -> 'Electrician', etc.
  const userType = userRole.typeName as UserType;

  const result = await earningService.scanQrWithTdsDeduction({
    userId: user.id,
    roleId: user.roleId,
    userType: userType,
    latitude,
    longitude,
    metadata
  }, qrCode);

  res.json(success(result, 'Scan successful'));
};

export const getEarningHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20, fromDate, toDate, status } = req.query;

  const opts = {
    page: parseInt(String(page)),
    pageSize: parseInt(String(pageSize)),
    fromDate: fromDate ? String(fromDate) : undefined,
    toDate: toDate ? String(toDate) : undefined,
    status: status ? String(status) : undefined
  };

  const result = await earningHistoryService.getEarningHistory(user.id, opts);

  res.json(success(result));
};

export const getEarningDetail = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const detail = await earningHistoryService.getEarningDetail(parseInt(id), user.id);
  if (!detail) return res.status(404).json({ success: false, error: { message: 'Earning record not found' } });
  res.json(success(detail));
};

export const getPassbook = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const passbook = await earningHistoryService.getPassbook(user.id);
  res.json(success(passbook));
}

export const getLedgerHistory = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20, fromDate, toDate } = req.query;

  const opts = {
    page: parseInt(String(page)),
    pageSize: parseInt(String(pageSize)),
    fromDate: fromDate ? String(fromDate) : undefined,
    toDate: toDate ? String(toDate) : undefined
  };

  const result = await earningHistoryService.getLedgerHistory(user.id, opts);
  res.json(success(result));
}