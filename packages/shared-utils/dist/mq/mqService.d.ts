import { BaseMQConnector } from './baseMQConnector';
export declare const initMQ: () => BaseMQConnector;
export declare const publish: (topic: string, payload: any) => Promise<void>;
export declare const subscribe: (topic: string, handler: (payload: any) => Promise<void>) => Promise<void>;
