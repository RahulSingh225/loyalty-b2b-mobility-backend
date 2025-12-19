import { Router } from 'express';
import { list, getOne, create, update, remove } from '../controllers/master.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Protected endpoints
router.get('/:table', authenticate, list);
router.get('/:table/:id', authenticate, getOne);
router.post('/:table', authenticate, create);
router.put('/:table/:id', authenticate, update);
router.delete('/:table/:id', authenticate, remove);

export default router;
