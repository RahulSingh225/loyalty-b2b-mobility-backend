import { BullMQConnector } from '@loyalty/shared-utils';

// Singleton instance for the Notification Service
export const notificationConnector = new BullMQConnector();

/**
 * Publish a notification event to the queue.
 * @param topic - The topic name (e.g., 'email', 'push')
 * @param payload - Arbitrary payload object that will be validated by the consumer.
 */
export async function publishNotification(topic: string, payload: unknown): Promise<void> {
    // In a real implementation you would validate payload against a schema before publishing.
    await notificationConnector.publish(topic, payload);
}
