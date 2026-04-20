import express from 'express';
import { listCreatives } from '../controllers/creative.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = express.Router();

router.get('/', async (req, res, next) => {
    if (req.headers.authorization) {
        return await authenticate(req, res, next);
    }
    next();
}, asyncHandler(listCreatives));

export default router;
