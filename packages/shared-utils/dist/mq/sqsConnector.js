"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqsConnector = void 0;
const baseMQConnector_1 = require("./baseMQConnector");
const client_sqs_1 = require("@aws-sdk/client-sqs");
class SqsConnector extends baseMQConnector_1.BaseMQConnector {
    constructor() {
        super();
        this.polling = new Map();
        this.client = new client_sqs_1.SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    }
    resolveQueueUrl(topic) {
        // Prefer explicit mapping per-topic: SQS_QUEUE_URL_<TOPIC>
        const explicit = process.env[`SQS_QUEUE_URL_${topic.toUpperCase()}`];
        if (explicit)
            return explicit;
        // fallback single queue
        if (process.env.SQS_QUEUE_URL)
            return process.env.SQS_QUEUE_URL;
        throw new Error('SQS queue URL not configured for topic ' + topic);
    }
    publish(topic, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const QueueUrl = this.resolveQueueUrl(topic);
            const cmd = new client_sqs_1.SendMessageCommand({ QueueUrl, MessageBody: JSON.stringify(payload) });
            yield this.client.send(cmd);
        });
    }
    subscribe(topic, handler) {
        return __awaiter(this, void 0, void 0, function* () {
            const QueueUrl = this.resolveQueueUrl(topic);
            this.polling.set(topic, true);
            const poll = () => __awaiter(this, void 0, void 0, function* () {
                while (this.polling.get(topic)) {
                    try {
                        const receive = new client_sqs_1.ReceiveMessageCommand({
                            QueueUrl,
                            MaxNumberOfMessages: 10,
                            WaitTimeSeconds: 20,
                            VisibilityTimeout: 30,
                        });
                        const res = yield this.client.send(receive);
                        const messages = res.Messages || [];
                        for (const msg of messages) {
                            try {
                                const body = msg.Body ? JSON.parse(msg.Body) : null;
                                yield handler(body);
                                if (msg.ReceiptHandle) {
                                    yield this.client.send(new client_sqs_1.DeleteMessageCommand({ QueueUrl, ReceiptHandle: msg.ReceiptHandle }));
                                }
                            }
                            catch (err) {
                                // swallow handler errors; message will become visible again after visibility timeout
                                // eslint-disable-next-line no-console
                                console.error('SQS handler error', err);
                            }
                        }
                    }
                    catch (err) {
                        // eslint-disable-next-line no-console
                        console.error('SQS poll error', err);
                        yield new Promise((r) => setTimeout(r, 1000));
                    }
                }
            });
            // start polling
            poll();
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            // stop all pollers
            for (const k of Array.from(this.polling.keys()))
                this.polling.set(k, false);
        });
    }
}
exports.SqsConnector = SqsConnector;
