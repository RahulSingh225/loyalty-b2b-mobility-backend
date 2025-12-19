import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';
import { success } from '../utils/response';

export const createTicket = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const result = await ticketService.createTicket(userId, req.body);
    res.status(201).json(success(result, 'Ticket created'));
};

export const listTickets = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    // TODO: Check if admin from user role/type
    const isAdmin = false; // Mock for now, need role check

    const { page, pageSize } = req.query;
    const result = await ticketService.listTickets(userId, isAdmin, {
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20
    });
    res.json(success(result));
};

export const updateTicket = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const ticketId = Number(req.params.id);
    const isAdmin = false; // Mock

    const result = await ticketService.updateTicket(ticketId, req.body, userId, isAdmin);
    res.json(success(result, 'Ticket updated'));
};
