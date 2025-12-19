import { BaseMQConnector } from './baseMQConnector';
export declare class SqsConnector extends BaseMQConnector {
    private client;
    private polling;
    constructor();
    private resolveQueueUrl;
    publish(topic: string, payload: any): Promise<void>;
    subscribe(topic: string, handler: (payload: any) => Promise<void>): Promise<void>;
    close(): Promise<void>;
}
