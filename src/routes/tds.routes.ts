import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { TdsController } from '../controllers/tds.controller';

const router = Router();

// User endpoints
router.get('/summary', authenticate, TdsController.getUserTdsSummary);
router.get('/history', authenticate, TdsController.getUserTdsHistory);

// Admin endpoints
router.get('/admin/stats', authenticate, TdsController.getGlobalTdsStats);
router.get('/admin/fy/:financialYear', authenticate, TdsController.getTdsRecordsByFy);
router.get('/admin/status/:status', authenticate, TdsController.getTdsRecordsByStatus);
router.get('/admin/audit/:userId', authenticate, TdsController.auditUserTds);
router.post('/admin/fy-reset', authenticate, TdsController.triggerFyReset);

export default router;
