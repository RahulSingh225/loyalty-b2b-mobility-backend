import { BaseMQConnector } from './baseMQConnector';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

export class BullMQConnector extends BaseMQConnector {
  private connection: IORedis;
  private workers = new Map<string, Worker>();

  constructor() {
    super();
    this.connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async publish(topic: string, payload: any) {
    const q = new Queue(topic, { connection: this.connection });
    await q.add('job', payload);
  }

  async subscribe(topic: string, handler: (payload: any) => Promise<void>) {
    if (this.workers.has(topic)) return;
    const worker = new Worker(topic, async (job: Job) => {
      await handler(job.data);
    }, { connection: this.connection });
    this.workers.set(topic, worker);
  }

  async close() {
    for (const w of this.workers.values()) {
      await w.close();
    }
    await this.connection.quit();
  }
}
