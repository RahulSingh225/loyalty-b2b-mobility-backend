import { BaseMQConnector } from './baseMQConnector';
import amqp from 'amqplib';

export class RabbitMQConnector extends BaseMQConnector {
  private conn?: amqp.Connection;
  private channel?: amqp.Channel;

  private async ensure() {
    if (this.channel && this.conn) return;
    const url = process.env.RABBITMQ_URL || 'amqp://localhost';
    this.conn = await amqp.connect(url);
    this.channel = await this.conn.createChannel();
  }

  async publish(topic: string, payload: any) {
    await this.ensure();
    await this.channel!.assertQueue(topic, { durable: true });
    this.channel!.sendToQueue(topic, Buffer.from(JSON.stringify(payload)), { persistent: true });
  }

  async subscribe(topic: string, handler: (payload: any) => Promise<void>) {
    await this.ensure();
    await this.channel!.assertQueue(topic, { durable: true });
    await this.channel!.consume(topic, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        await handler(payload);
        this.channel!.ack(msg);
      } catch (err) {
        // nack and requeue
        this.channel!.nack(msg, false, true);
      }
    });
  }

  async close() {
    await this.channel?.close();
    await this.conn?.close();
  }
}
