import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';
import { success } from '../utils/response';
import { db } from '../config/db';
import { ticketTypes, ticketStatuses } from '../schema';
import { FileService } from '../connectors/fileService';
import { S3Connector } from '../connectors/s3Connector';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { TicketInputSchema } from '../middlewares/zod';

export const createTicket = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const file = (req as any).file as Express.Multer.File | undefined;

    let imageUrl: string | undefined;

    // Handle file upload if present
    if (file) {
        const s3Connector = new S3Connector();
        const fileService = new FileService(s3Connector);

        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const s3Path = `tickets/${userId}/${fileName}`;

        // Upload to S3
        imageUrl = await fileService.uploadFile(s3Path, file.buffer);
    }

    // Parse and validate form fields (multipart/form-data sends everything as strings)
    const bodyData = {
        ...req.body,
        typeId: req.body.typeId ? Number(req.body.typeId) : undefined,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
    };

    // Validate against schema
    const validatedData = TicketInputSchema.parse(bodyData);

    // Merge imageUrl into validated data if file was uploaded
    const ticketData = {
        ...validatedData,
        ...(imageUrl && { imageUrl })
    };

    const result = await ticketService.createTicket(userId, ticketData);
    const ticketId = `TCK${result.id}`;
    res.status(201).json(success({ ...result, ticket_id: ticketId }, `Ticket raised successfully (ID: ${ticketId})`));
};

export const listTickets = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    // TODO: Check if admin from user role/type
    const isAdmin = false; // Mock for now, need role check

    const { page, pageSize, status } = req.query;
    const result = await ticketService.listTickets(userId, isAdmin, {
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
        status: status as string
    });
    console.log(result);
    res.json(success(result));
};

export const updateTicket = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const ticketId = Number(req.params.id);
    const isAdmin = false; // Mock

    const result = await ticketService.updateTicket(ticketId, req.body, userId, isAdmin);
    res.json(success(result, 'Ticket updated'));
};

export const getTicketTypes = async (_req: Request, res: Response) => {
    const types = await db.select().from(ticketTypes).orderBy(ticketTypes.name).execute();
    const statuses = await db.select().from(ticketStatuses).orderBy(ticketStatuses.name).execute();
    res.json(success({ types, statuses }));
};
