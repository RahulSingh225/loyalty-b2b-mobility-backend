import { inappNotifications } from '../schema';
import { BaseService } from './baseService';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../config/db';

export type NotificationCategory = 'SCAN' | 'REDEMPTION' | 'REFERRAL' | 'REGISTRATION' | 'GENERAL';

interface CreateNotificationParams {
    userId: number;
    title: string;
    body: string;
    category: NotificationCategory;
    metadata?: any;
}

export class NotificationService extends BaseService<typeof inappNotifications> {
    constructor() {
        super(inappNotifications);
    }

    async createNotification(params: CreateNotificationParams) {
        const { userId, title, body, category, metadata } = params;

        return await this.withTx(async (tx) => {
            const [notification] = await tx.insert(inappNotifications).values({
                userId,
                title,
                body,
                category,
                isRead: false,
                metadata: metadata || {},
            }).returning();

            return notification;
        });
    }

    async getUserNotifications(userId: number, page: number = 1, limit: number = 20) {
        const offset = (page - 1) * limit;

        const data = await db.select()
            .from(inappNotifications)
            .where(
                eq(inappNotifications.userId, userId)
            )
            .orderBy(desc(inappNotifications.createdAt))
            .limit(limit)
            .offset(offset);

        // Get unread count
        const [unread] = await db.select({ count: sql<number>`count(*)` })
            .from(inappNotifications)
            .where(
                and(
                    eq(inappNotifications.userId, userId),
                    eq(inappNotifications.isRead, false)
                )
            );

        return {
            notifications: data,
            unreadCount: Number(unread?.count || 0),
            page,
            limit
        };
    }

    async markAsRead(notificationId: number, userId: number) {
        return await this.withTx(async (tx) => {
            const [updated] = await tx.update(inappNotifications)
                .set({ isRead: true })
                .where(
                    and(
                        eq(inappNotifications.id, notificationId),
                        eq(inappNotifications.userId, userId)
                    )
                )
                .returning();
            return updated;
        });
    }

    async markAllAsRead(userId: number) {
        return await this.withTx(async (tx) => {
            await tx.update(inappNotifications)
                .set({ isRead: true })
                .where(
                    and(
                        eq(inappNotifications.userId, userId),
                        eq(inappNotifications.isRead, false)
                    )
                );
            return { success: true };
        });
    }
}

export const notificationService = new NotificationService();
