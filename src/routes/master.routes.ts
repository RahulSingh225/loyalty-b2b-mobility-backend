import { Router } from 'express';
import { list, getOne, create, update, remove, getPincode } from '../controllers/master.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

// Protected endpoints
router.get('/pincode/:pincode', authenticate, asyncHandler(getPincode));
router.get('/:table', authenticate, list);
router.get('/:table/:id', authenticate, getOne);
router.post('/:table', authenticate, create);
router.put('/:table/:id', authenticate, update);
router.delete('/:table/:id', authenticate, remove);

export default router;
