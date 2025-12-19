import { BaseMQConnector } from './baseMQConnector';
export declare class RabbitMQConnector extends BaseMQConnector {
    private connection;
    private channel;
    private init;
    publish(topic: string, payload: any): Promise<void>;
    subscribe(topic: string, handler: (payload: any) => Promise<void>): Promise<void>;
    close(): Promise<void>;
}
