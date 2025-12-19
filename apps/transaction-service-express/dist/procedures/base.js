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
exports.Procedure = void 0;
const shared_db_1 = require("@loyalty/shared-db");
const uuid_1 = require("uuid");
class Procedure {
    constructor(input) {
        this.input = input;
        this.correlationId = (0, uuid_1.v4)();
    }
    logEvent(eventCode, entityId, extraMetadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const [event] = yield shared_db_1.db.select().from(shared_db_1.eventMaster).where((0, shared_db_1.eq)(shared_db_1.eventMaster.eventKey, eventCode));
            if (!event || !event.isActive)
                return;
            const logData = {
                userId: this.userId,
                action: event.name,
                eventType: event.category,
                entityId: entityId === null || entityId === void 0 ? void 0 : entityId.toString(),
                correlationId: this.correlationId,
                metadata: Object.assign(Object.assign({}, this.metadata), extraMetadata),
                ipAddress: this.ip,
                userAgent: this.userAgent
            };
            yield shared_db_1.db.insert(shared_db_1.eventLogs).values(logData);
            yield shared_db_1.db.insert(shared_db_1.systemLogs).values({
                logLevel: 'INFO',
                componentName: this.constructor.name,
                message: `${event.name} triggered`,
                action: event.name,
                correlationId: this.correlationId,
                userId: this.userId,
                ipAddress: this.ip,
                userAgent: this.userAgent
            });
        });
    }
    withTransaction(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            return shared_db_1.db.transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield fn(tx);
                }
                catch (err) {
                    yield this.logEvent('API_ERROR', undefined, { error: err.message });
                    throw err;
                }
            }));
        });
    }
    setContext(userId, ip, userAgent, metadata) {
        this.userId = userId;
        this.ip = ip;
        this.userAgent = userAgent;
        this.metadata = metadata;
        return this;
    }
}
exports.Procedure = Procedure;
