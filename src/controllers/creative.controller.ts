import { Request, Response } from 'express';
import { creativeService } from '../services/creative.service';
import { success } from '../utils/response';

export const listCreatives = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const result = await creativeService.listCreativesForUser(user.id, user.roleId);
    res.json(success(result));
};
