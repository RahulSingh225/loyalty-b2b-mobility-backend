import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { success } from '../utils/response';
import { AppError } from '../middlewares/errorHandler';

export const getNotifications = async (req: Request, res: Response) => {
    // Assuming user is attached to req by auth middleware
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError('User not authenticated', 401);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await notificationService.getUserNotifications(userId, page, limit);
    res.json(success(result, 'Notifications fetched successfully'));
};

export const markRead = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) throw new AppError('User not authenticated', 401);

    const result = await notificationService.markAsRead(Number(id), userId);
    if (!result) throw new AppError('Notification not found', 404);

    res.json(success(result, 'Notification marked as read'));
};

export const markAllRead = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError('User not authenticated', 401);

    await notificationService.markAllAsRead(userId);
    res.json(success(null, 'All notifications marked as read'));
};
