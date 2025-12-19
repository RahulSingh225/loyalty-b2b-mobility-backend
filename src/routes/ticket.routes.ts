import express from 'express';
import { createTicket, listTickets, updateTicket } from '../controllers/ticket.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = express.Router();

router.post('/', authenticate, asyncHandler(createTicket));
router.get('/', authenticate, asyncHandler(listTickets));
router.patch('/:id', authenticate, asyncHandler(updateTicket));

export default router;
