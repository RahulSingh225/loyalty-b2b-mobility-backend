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
exports.errorHandler = exports.AppError = void 0;
const shared_utils_1 = require("@loyalty/shared-utils");
const uuid_1 = require("uuid");
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const correlationId = ((_a = req.headers['x-correlation-id']) === null || _a === void 0 ? void 0 : _a.toString()) || (0, uuid_1.v4)();
    if (err instanceof AppError) {
        yield (0, shared_utils_1.logSystemError)(err.message, correlationId, (_b = req.user) === null || _b === void 0 ? void 0 : _b.id, req.ip, req.get('User-Agent'));
        return res.status(err.statusCode).json({
            success: false,
            error: { message: err.message, correlationId },
            code: err.statusCode,
        });
    }
    console.error('UNHANDLED ERROR:', err);
    yield (0, shared_utils_1.logSystemError)('Internal server error', correlationId, (_c = req.user) === null || _c === void 0 ? void 0 : _c.id, req.ip, req.get('User-Agent'));
    res.status(500).json({
        success: false,
        error: { message: 'Internal server error', correlationId },
        code: 500,
    });
});
exports.errorHandler = errorHandler;
