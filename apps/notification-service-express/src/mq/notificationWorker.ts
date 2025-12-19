import { notificationConnector } from './notificationQueue';
import { NotificationPayloadSchema, type NotificationPayload } from '../events/notificationEvent';
import { FcmConnector } from '../communications/vendors/fcmConnector';
import nodemailer from 'nodemailer';

// Initialize connectors
const fcm = new FcmConnector();

// Simple nodemailer transporter (SMTP config via env)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Handler for push notifications (FCM)
 */
async function handlePush(payload: NotificationPayload) {
    await fcm.send({
        token: payload.data?.token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
    });
}

/**
 * Handler for email notifications
 */
async function handleEmail(payload: NotificationPayload) {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: payload.data?.email,
        subject: payload.title,
        text: payload.body,
        html: `<p>${payload.body}</p>`,
    };
    await transporter.sendMail(mailOptions);
}

// Subscribe to topics when the service starts
export async function startNotificationWorker() {
    // Push (FCM) topic
    await notificationConnector.subscribe('push', async (raw) => {
        const parsed = NotificationPayloadSchema.safeParse(raw);
        if (!parsed.success) {
            console.error('Invalid push payload', parsed.error);
            return;
        }
        await handlePush(parsed.data);
    });

    // Email topic
    await notificationConnector.subscribe('email', async (raw) => {
        const parsed = NotificationPayloadSchema.safeParse(raw);
        if (!parsed.success) {
            console.error('Invalid email payload', parsed.error);
            return;
        }
        await handleEmail(parsed.data);
    });

    console.log('Notification worker subscribed to push and email topics');
}
