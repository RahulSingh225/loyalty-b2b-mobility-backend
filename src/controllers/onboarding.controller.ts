import { Request, Response } from 'express';
import { onboardingService } from '../services/onboarding.service';
import { kycService } from '../services/kyc.service';
import { success } from '../utils/response';

export const registerUser = async (req: Request, res: Response) => {
    const result = await onboardingService.registerUser(req.body);
    res.status(201).json(success(result, 'User registered successfully'));
};

export const verifyKyc = async (req: Request, res: Response) => {
    const { type, value } = req.body;
    const result = await kycService.verifyDocument(type, value);
    res.json(success(result));
};
