import { BaseService, PaginationOptions } from './baseService';
import { db } from '../config/db';
import { tickets, ticketTypes, ticketStatuses, eventLogs, eventMaster } from '../schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler';
import { EVENT_TYPES } from '../config/events';

export const TicketInputSchema = z.object({
    typeId: z.number(),
    subject: z.string().min(1),
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

    // Helper to log events (simplified version of Procedure.logEvent)
    private async logTicketEvent(action: string, ticketId: number, userId: number, metadata?: any) {
        // 1. Ensure Event Master exists (or use generic fallback)
        // For this implementation, we assume EVENT_TYPES keys match event_master keys or we insert generic
        // The user requested: "create two event types if its not there"

        // Check/Create Event Master
        let [event] = await db.select().from(eventMaster).where(eq(eventMaster.eventKey, action));
        if (!event) {
            [event] = await db.insert(eventMaster).values({
                eventKey: action,
                name: action.replace('_', ' '),
                category: 'TICKETING',
                isActive: true
            }).returning();
        }

        await db.insert(eventLogs).values({
            userId,
            eventId: event.id,
            action: event.name,
            eventType: event.category || 'TICKETING',
            entityId: String(ticketId),
            metadata: metadata || {}
        });
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
            // We need to do this OUTSIDE the return or await it.
            // Also we need to use the helper which uses 'db'. 
            // CAUTION: mixing tx and db. Ideally helper accepts tx.
            // But event logging usually safe to be independent or part of tx.
            // Let's defer to after ticket creation logic if we want to use the helper method defined on class,
            // but since we are inside withTx, we should ideally pass tx. 
            // For simplicity, we'll run it after. 
            // Wait, if tx fails, we shouldn't log "CREATED".

            // We'll reimplement log logic inline or make helper static/tx-aware.
            // Inline for now to use `tx`.

            // Ensure event exists
            let [event] = await tx.select().from(eventMaster).where(eq(eventMaster.eventKey, EVENT_TYPES.TICKET_CREATE));
            if (!event) {
                [event] = await tx.insert(eventMaster).values({
                    eventKey: EVENT_TYPES.TICKET_CREATE,
                    name: 'Ticket Created',
                    category: 'TICKETING',
                    isActive: true
                }).returning();
            }

            await tx.insert(eventLogs).values({
                userId,
                eventId: event.id,
                action: 'Ticket Created',
                eventType: 'TICKETING',
                entityId: String(ticket.id),
                metadata: validated.metadata || {}
            });

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
            let [event] = await tx.select().from(eventMaster).where(eq(eventMaster.eventKey, EVENT_TYPES.TICKET_UPDATE));
            if (!event) {
                [event] = await tx.insert(eventMaster).values({
                    eventKey: EVENT_TYPES.TICKET_UPDATE,
                    name: 'Ticket Updated',
                    category: 'TICKETING',
                    isActive: true
                }).returning();
            }

            await tx.insert(eventLogs).values({
                userId,
                eventId: event.id,
                action: 'Ticket Updated',
                eventType: 'TICKETING',
                entityId: String(ticket.id),
                metadata: updates || {}
            });

            return updated;
        });
    }

    async listTickets(userId: number, isAdmin: boolean, opts: PaginationOptions = {}) {
        const where = eq(tickets.createdBy, userId);
        return this.findManyPaginated({createdBy: userId}, { ...opts, orderBy: desc(tickets.createdAt) });
    }
}

export const ticketService = new TicketService();
