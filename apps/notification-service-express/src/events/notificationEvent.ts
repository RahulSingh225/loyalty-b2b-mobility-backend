import { z } from 'zod';

// Base notification payload
export const NotificationPayloadSchema = z.object({
    userId: z.string().uuid(),
    title: z.string().min(1),
    body: z.string().min(1),
    // optional data for push or email
    data: z.record(z.any()).optional(),
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;
