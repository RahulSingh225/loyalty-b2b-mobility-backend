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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullMQConnector = void 0;
const baseMQConnector_1 = require("./baseMQConnector");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
class BullMQConnector extends baseMQConnector_1.BaseMQConnector {
    constructor() {
        super();
        this.workers = new Map();
        this.connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    publish(topic, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const q = new bullmq_1.Queue(topic, { connection: this.connection });
            yield q.add('job', payload);
        });
    }
    subscribe(topic, handler) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.workers.has(topic))
                return;
            const worker = new bullmq_1.Worker(topic, (job) => __awaiter(this, void 0, void 0, function* () {
                yield handler(job.data);
            }), { connection: this.connection });
            this.workers.set(topic, worker);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const w of this.workers.values()) {
                yield w.close();
            }
            yield this.connection.quit();
        });
    }
}
exports.BullMQConnector = BullMQConnector;
