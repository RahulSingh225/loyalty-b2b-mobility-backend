import { BaseService, PaginationOptions } from './baseService';
import { db } from '../config/db';
import { tickets, ticketTypes, ticketStatuses } from '../schema';
import { eq, and, sql, desc, SQL } from 'drizzle-orm';
import { emit } from '../mq/mqService';
import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler';
import { EVENT_TYPES } from '../config/events';
import { S3Connector } from '../connectors/s3Connector';

export const TicketInputSchema = z.object({
    typeId: z.number(),
    subject: z.string().optional(),
    description: z.string().min(1),
    priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
    imageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export const TicketUpdateSchema = z.object({
    statusId: z.number().optional(),
    priority: z.enum(['Low', 'Medium', 'High']).optional(),
    resolutionNotes: z.string().optional(),
    assigneeId: z.number().optional(),
    metadata: z.record(z.any()).optional(),
});

export type TicketInput = z.infer<typeof TicketInputSchema>;

export class TicketService extends BaseService<typeof tickets> {
    constructor() {
        super(tickets);
    }

    private async logEvent(userId: number, eventCode: string, entityId?: string | number, extraMetadata?: any) {
        try {
            await emit(eventCode, {
                userId,
                entityId,
                metadata: extraMetadata || {},
            });
        } catch (error) {
            console.error(`[TicketService] Failed to emit event ${eventCode}:`, error);
        }
    }

    async createTicket(userId: number, data: TicketInput) {
        const validated = TicketInputSchema.parse(data);

        return this.withTx(async (tx) => {
            // 1. Validate Type
            const [typeExists] = await tx.select().from(ticketTypes).where(eq(ticketTypes.id, validated.typeId)).limit(1);
            if (!typeExists) throw new AppError('Invalid Ticket Type', 400);

            // 2. Get Default Status (Open)
            const [openStatus] = await tx.select().from(ticketStatuses).where(eq(ticketStatuses.name, 'Open')).limit(1);
            const statusId = openStatus?.id || 1; // Fallback

            // 3. Create Ticket
            const [ticket] = await tx.insert(tickets).values({
                createdBy: userId,
                typeId: validated.typeId,
                statusId: statusId,
                subject: validated.subject,
                description: validated.description,
                priority: validated.priority,
                imageUrl: validated.imageUrl,
                videoUrl: validated.videoUrl,
                metadata: validated.metadata || {},
            }).returning();

            // 4. Log Event
            await this.logEvent(userId, EVENT_TYPES.TICKET_CREATE, ticket.id, validated.metadata);

            return ticket;
        });
    }

    async updateTicket(ticketId: number, data: any, userId: number, isAdmin = false) {
        const [ticket] = await this.findOne(eq(tickets.id, ticketId));
        if (!ticket) throw new AppError('Ticket not found', 404);

        if (!isAdmin && ticket.createdBy !== userId) {
            throw new AppError('Unauthorized', 403);
        }

        const updates = TicketUpdateSchema.parse(data);

        let extraUpdates: any = {};
        if (updates.statusId) {
            const [status] = await db.select().from(ticketStatuses).where(eq(ticketStatuses.id, updates.statusId)).limit(1);
            if (status && (status.name === 'Resolved' || status.name === 'Closed')) {
                extraUpdates.resolvedAt = new Date().toISOString();
            }
        }

        return this.withTx(async (tx) => {
            const [updated] = await tx.update(tickets)
                .set({ ...updates, ...extraUpdates })
                .where(eq(tickets.id, ticketId))
                .returning();

            // Log Update
            await this.logEvent(userId, EVENT_TYPES.TICKET_UPDATE, ticket.id, updates);

            return updated;
        });
    }

    async listTickets(userId: number, isAdmin: boolean, opts: PaginationOptions & { status?: string } = {}) {
        const filters: any = { createdBy: userId };

        if (opts.status === 'resolved') {
            const statusNames = ['Resolved', 'Closed', 'Resolved', 'Closed', 'Completed', 'COMPLETED', 'RESOLVED', 'CLOSED'];
            const subResult = await db.select({ id: ticketStatuses.id })
                .from(ticketStatuses)
                .where(sql`LOWER(${ticketStatuses.name}) IN ('resolved', 'closed', 'completed')`);
            filters.statusId = subResult.length > 0 ? subResult.map(s => s.id) : [2, 3, 5]; // Fallback to common IDs (assuming 5 is Completed)
        } else if (opts.status === 'pending') {
            const subResult = await db.select({ id: ticketStatuses.id })
                .from(ticketStatuses)
                .where(sql`LOWER(${ticketStatuses.name}) NOT IN ('resolved', 'closed', 'completed')`);
            filters.statusId = subResult.length > 0 ? subResult.map(s => s.id) : [1]; // Fallback
        }

        const { page = 1, pageSize = 20, orderBy } = opts;
        const offset = (page - 1) * pageSize;

        const isSql = filters && (('queryChunks' in filters) || ('mapWith' in filters));
        const cond = filters && typeof filters === 'object' && !isSql
            ? this.whereObj(filters)
            : (filters as SQL | undefined);

        const qb = db.select({
            ticket: tickets,
            typeName: ticketTypes.name,
            statusName: ticketStatuses.name
        })
            .from(tickets)
            .leftJoin(ticketTypes, eq(tickets.typeId, ticketTypes.id))
            .leftJoin(ticketStatuses, eq(tickets.statusId, ticketStatuses.id))
            .where(cond ?? sql`true`)
            .orderBy(orderBy || desc(tickets.createdAt))
            .limit(pageSize)
            .offset(offset);

        const countQb = db.select({ count: sql<number>`count(*)` })
            .from(tickets)
            .where(cond ?? sql`true`);

        const [rows, countResult] = await Promise.all([qb, countQb]);
        const total = Number(countResult[0].count);

        // Generate signed URLs for images if they exist
        const s3Connector = new S3Connector();
        const ticketsWithMappedInfo = await Promise.all(
            rows.map(async (r) => {
                let signedImageUrl = r.ticket.imageUrl;

                // Check if imageUrl exists and is an S3 URL
                if (r.ticket.imageUrl && r.ticket.imageUrl.startsWith('s3://')) {
                    try {
                        const s3Key = r.ticket.imageUrl.replace(/^s3:\/\/[^\/]+\//, '');
                        signedImageUrl = await s3Connector.getSignedUrl(s3Key, 3600);
                    } catch (error) {
                        console.error(`Failed to generate signed URL for ticket ${r.ticket.id}:`, error);
                    }
                }

                return {
                    ...r.ticket,
                    typeName: r.typeName || 'Unknown',
                    status: r.statusName || 'PENDING', // Mapped status name for frontend
                    imageUrl: signedImageUrl
                };
            })
        );

        return {
            rows: ticketsWithMappedInfo,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }
}

export const ticketService = new TicketService();
