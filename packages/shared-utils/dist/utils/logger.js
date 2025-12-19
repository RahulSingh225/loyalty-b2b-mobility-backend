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
exports.logSystemError = void 0;
const shared_db_1 = require("@loyalty/shared-db");
const logSystemError = (message, correlationId, userId, ip, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
    yield shared_db_1.db.insert(shared_db_1.systemLogs).values({
        logLevel: 'ERROR',
        componentName: 'system',
        message,
        action: 'error',
        correlationId,
        userId,
        ipAddress: ip,
        userAgent
    });
});
exports.logSystemError = logSystemError;
