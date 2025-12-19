import { BaseMQConnector } from './baseMQConnector';
export declare class BullMQConnector extends BaseMQConnector {
    private connection;
    private workers;
    constructor();
    publish(topic: string, payload: any): Promise<void>;
    subscribe(topic: string, handler: (payload: any) => Promise<void>): Promise<void>;
    close(): Promise<void>;
}
