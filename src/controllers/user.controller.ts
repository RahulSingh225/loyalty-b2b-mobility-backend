import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import * as schema from '../schema';
import { cacheMaster } from '../utils/masterCache';
import { S3Connector } from '../connectors/s3Connector';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';
import { userService } from '../services/userService';
import { KycApproveProcedure } from '../procedures/kyc-approve';

export const getProfile = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const channelPartner = req.headers['x-channel-partner'];
  const apiKey = req.headers['x-api-key'];

  const isTrimmed = (channelPartner === 'GYFTR' && apiKey === process.env.GYFTR_API_KEY);
  console.log('isTrimmed', isTrimmed);

  const profile = await userService.getProfile(user.id, { isTrimmed });
  res.json(success(profile));
};

const ProfileUpdateSchema = z.object({
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional(),
  pincode: z.string().length(6).optional(),
  profilePhotoUrl: z.string().optional(),
  shopName: z.string().optional(), // For Retailer usertype
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

const RegistrationProfileUpdateSchema = z.object({
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  pincode: z.string().length(6),
  profilePhotoUrl: z.string().min(1, "Profile photo is required"),
  shopName: z.string().optional(), // For Retailer usertype
}).strict();

const s3 = new S3Connector();

const processProfileUpdate = async (req: Request, sourceData: any) => {
  const user = (req as any).user;
  let profilePhotoUrl = sourceData.profilePhotoUrl;

  if (req.file) {
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `users/${user.id}/profile/avatar-${Date.now()}.${fileExtension}`;
    profilePhotoUrl = await s3.upload(fileName, req.file.buffer);
  }

  return { ...sourceData, ...(profilePhotoUrl && { profilePhotoUrl }) };
};

export const updateProfile = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const rawData = await processProfileUpdate(req, req.body);
  const updates = ProfileUpdateSchema.parse(rawData);
  const updated = await userService.updateProfile(user.id, updates);
  res.json(success(updated));
};


export const updateRegistrationProfile = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const rawData = await processProfileUpdate(req, req.body);

  // 1. Profile Photo Validation
  // If no new photo uploaded and no photo URL provided in body, check if user already has one
  if (!rawData.profilePhotoUrl) {
    const [existingUser] = await userService.findOne({ id: user.id });
    if (!existingUser?.profilePhotoUrl) {
      throw new AppError('Profile photo is required', 400);
    }
    // Carry over existing URL to pass schema validation
    rawData.profilePhotoUrl = existingUser.profilePhotoUrl;
  }

  // 2. Shop Name Validation for Retailers
  const userTypes = await cacheMaster('userTypes', async () => db.select().from(schema.userTypeEntity).execute());
  const userRole = userTypes.find((type) => type.id === user.roleId);
  const isRetailer = userRole?.typeName === 'Retailer';

  if (isRetailer && (!rawData.shopName || rawData.shopName.trim() === '')) {
    throw new AppError('Shop Name is required', 400);
  }

  const updates = RegistrationProfileUpdateSchema.parse(rawData);
  const updated = await userService.updateRegistrationProfile(user.id, updates, { ip: req.ip, userAgent: req.get('user-agent') });
  res.json(success(updated));
};
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

export const listUsersWithRoleFilter = async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20, search, ...filters } = req.query;

  // Convert numeric string values to numbers for fields that should be numbers
  const processedFilters: Record<string, any> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'roleId' || key === 'approvalStatusId' || key === 'onboardingTypeId' || key === 'languageId') {
      processedFilters[key] = parseInt(String(value));
    } else if (key === 'isSuspended') {
      processedFilters[key] = value === 'true';
    } else {
      processedFilters[key] = value;
    }
  }

  // Add search parameter if provided
  if (search) {
    processedFilters.search = String(search);
  }

  const opts = { page: parseInt(String(page)), pageSize: parseInt(String(pageSize)) };

  // Force filter to only show Retailer users
  const result = await userService.listUsersWithRoleFilter(processedFilters, opts, 'Retailer');
  res.json(success(result));
}

export const deleteProfile = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await userService.deleteProfile(user.id);
  res.json(success(result));
}

