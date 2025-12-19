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
exports.subscribe = exports.publish = exports.initMQ = void 0;
const sqsConnector_1 = require("./sqsConnector");
const rabbitmqConnector_1 = require("./rabbitmqConnector");
const bullmqConnector_1 = require("./bullmqConnector");
let connector = null;
const initMQ = () => {
    const driver = process.env.MQ_DRIVER || 'bullmq';
    if (driver === 'sqs')
        connector = new sqsConnector_1.SqsConnector();
    else if (driver === 'rabbit')
        connector = new rabbitmqConnector_1.RabbitMQConnector();
    else
        connector = new bullmqConnector_1.BullMQConnector();
    return connector;
};
exports.initMQ = initMQ;
const publish = (topic, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!connector)
        (0, exports.initMQ)();
    return connector.publish(topic, payload);
});
exports.publish = publish;
const subscribe = (topic, handler) => __awaiter(void 0, void 0, void 0, function* () {
    if (!connector)
        (0, exports.initMQ)();
    return connector.subscribe(topic, handler);
});
exports.subscribe = subscribe;
