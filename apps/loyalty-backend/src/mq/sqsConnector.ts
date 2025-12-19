import { BaseMQConnector } from './baseMQConnector';
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

export class SqsConnector extends BaseMQConnector {
  private client: SQSClient;
  private polling = new Map<string, boolean>();

  constructor() {
    super();
    this.client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  private resolveQueueUrl(topic: string) {
    // Prefer explicit mapping per-topic: SQS_QUEUE_URL_<TOPIC>
    const explicit = process.env[`SQS_QUEUE_URL_${topic.toUpperCase()}`];
    if (explicit) return explicit;
    // fallback single queue
    if (process.env.SQS_QUEUE_URL) return process.env.SQS_QUEUE_URL;
    throw new Error('SQS queue URL not configured for topic ' + topic);
  }

  async publish(topic: string, payload: any) {
    const QueueUrl = this.resolveQueueUrl(topic);
    const cmd = new SendMessageCommand({ QueueUrl, MessageBody: JSON.stringify(payload) });
    await this.client.send(cmd);
  }

  async subscribe(topic: string, handler: (payload: any) => Promise<void>) {
    const QueueUrl = this.resolveQueueUrl(topic);
    this.polling.set(topic, true);

    const poll = async () => {
      while (this.polling.get(topic)) {
        try {
          const receive = new ReceiveMessageCommand({
            QueueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
            VisibilityTimeout: 30,
          });
          const res = await this.client.send(receive);
          const messages = res.Messages || [];
          for (const msg of messages) {
            try {
              const body = msg.Body ? JSON.parse(msg.Body) : null;
              await handler(body);
              if (msg.ReceiptHandle) {
                await this.client.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: msg.ReceiptHandle }));
              }
            } catch (err) {
              // swallow handler errors; message will become visible again after visibility timeout
              // eslint-disable-next-line no-console
              console.error('SQS handler error', err);
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('SQS poll error', err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    };

    // start polling
    poll();
  }

  async close() {
    // stop all pollers
    for (const k of Array.from(this.polling.keys())) this.polling.set(k, false);
  }
}
