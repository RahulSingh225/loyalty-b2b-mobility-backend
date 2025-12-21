import { BaseMQConnector } from './baseMQConnector';
import { SqsConnector } from './sqsConnector';
import { RabbitMQConnector } from './rabbitmqConnector';
import { BullMQConnector } from './bullmqConnector';

let connector: BaseMQConnector | null = null;

export const initMQ = () => {
  const driver = process.env.MQ_DRIVER || 'bullmq';
  if (driver === 'sqs') connector = new SqsConnector();
  else if (driver === 'rabbit') connector = new RabbitMQConnector();
  else connector = new BullMQConnector();
  return connector;
};

export const publish = async (topic: string, payload: any) => {
  if (!connector) initMQ();
  return connector!.publish(topic, payload);
};

export const subscribe = async (topic: string, handler: (payload: any) => Promise<void>) => {
  if (!connector) initMQ();
  return connector!.subscribe(topic, handler);
};

// Helper for OTP delivery (email or sms)
export const sendOtpMessage = async ({ phone, otp, channel }: { phone: string, otp: string, channel: 'sms'|'email' }) => {
  const topic = channel === 'sms' ? 'otp.sms' : 'otp.email';
  await publish(topic, { phone, otp });
};
