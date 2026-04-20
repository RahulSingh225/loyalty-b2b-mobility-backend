// EventBus.ts
import * as amqp from "amqplib";

export class EventBus {
    private connection?: amqp.Connection;
    private channel?: amqp.Channel;
    private readonly EXCHANGE_NAME = "main_event_bus";

    private async init() {
        if (this.channel) return;
        const url = `amqp://${process.env.BROKER_USERNAME}:${process.env.BROKER_PASSWORD}@${process.env.BROKER_IP}` || "amqp://localhost";
        console.log(url)
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();
        // 'topic' allows for flexible pattern-based routing
        await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });
    }

    // Used by Next.js Admin and Node.js Backend to emit events
    public async emit(routingKey: string, data: any) {
        await this.init();
        const payload = Buffer.from(JSON.stringify({
            event: routingKey,
            data,
            timestamp: new Date().toISOString()
        }));

        this.channel!.publish(this.EXCHANGE_NAME, routingKey, payload, { persistent: true });
        console.log(`[EventBus] Emitted: ${routingKey}`);
    }

    // Used by Notification/Email services to listen
    public async listen(queueName: string, patterns: string[], handler: (msg: any) => Promise<void>) {
        await this.init();
        // 1. Assert a durable queue for the specific service
        const q = await this.channel!.assertQueue(queueName, { durable: true });

        // 2. Bind the queue to the patterns (e.g., "user.*" or "ticket.create")
        for (const pattern of patterns) {
            await this.channel!.bindQueue(q.queue, this.EXCHANGE_NAME, pattern);
        }

        // 3. Consume
        this.channel!.consume(q.queue, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await handler(content);
                    this.channel!.ack(msg);
                } catch (err) {
                    console.error("Processing error", err);
                    this.channel!.nack(msg, false, true); // Requeue on error
                }
            }
        });
    }
}