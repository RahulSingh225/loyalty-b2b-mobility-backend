import express from 'express';
import { createMasterAdminHandler } from '../controllers/admin.controller';

const router = express.Router();

// Unprotected endpoint: only allowed when no master admin exists
router.post('/master-admin', createMasterAdminHandler);

export default router;
