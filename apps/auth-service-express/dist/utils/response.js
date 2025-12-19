"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = void 0;
const success = (data, message = 'Success', correlationId) => ({
    success: true,
    data,
    message,
    correlationId,
});
exports.success = success;
