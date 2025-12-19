import express from 'express';
import { listCreatives } from '../controllers/creative.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = express.Router();

router.get('/', authenticate, asyncHandler(listCreatives));

export default router;
