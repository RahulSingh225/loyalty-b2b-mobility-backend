import { Router } from 'express';
import { asyncHandler } from '../middlewares/errorHandler';
import { authenticate } from '../middlewares/auth';
import {
    getNotifications,
    markRead,
    markAllRead
} from '../controllers/notification.controller';

const router = Router();

// Protect all routes
router.use(authenticate);

router.get('/', asyncHandler(getNotifications));
router.patch('/:id/read', asyncHandler(markRead));
router.patch('/read-all', asyncHandler(markAllRead));

export default router;
