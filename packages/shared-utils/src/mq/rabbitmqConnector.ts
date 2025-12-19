import * as amqp from 'amqplib';
import { BaseMQConnector } from './baseMQConnector';

export class RabbitMQConnector extends BaseMQConnector {
  private connection: any = null;
  private channel: any = null;

  private async init() {
    if (this.channel && this.connection) return;
    const url = process.env.RABBITMQ_URL || 'amqp://localhost';
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
  }

  async publish(topic: string, payload: any): Promise<void> {
    if (!this.channel) await this.init();
    await this.channel!.assertQueue(topic, { durable: true });
    this.channel!.sendToQueue(topic, Buffer.from(JSON.stringify(payload)), { persistent: true });
  }

  async subscribe(topic: string, handler: (payload: any) => Promise<void>): Promise<void> {
    if (!this.channel) await this.init();
    await this.channel!.assertQueue(topic, { durable: true });
    await this.channel!.consume(topic, async (msg: amqp.ConsumeMessage | null) => {
      if (msg) {
        try {
          const payload = JSON.parse(msg.content.toString());
          await handler(payload);
          this.channel!.ack(msg);
        } catch (err) {
          // nack and requeue
          this.channel!.nack(msg, false, true);
        }
      }
    });
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
