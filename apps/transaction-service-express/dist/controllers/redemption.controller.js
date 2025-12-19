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
exports.requestRedemption = void 0;
const redemption_1 = require("../procedures/redemption");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middlewares/errorHandler");
const requestRedemption = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const procedure = new redemption_1.RedemptionProcedure(req.body).setContext(user.id, req.ip || '', req.get('User-Agent') || '');
    try {
        const result = yield procedure.execute();
        res.json((0, response_1.success)(result));
    }
    catch (err) {
        throw err instanceof errorHandler_1.AppError ? err : new errorHandler_1.AppError('Redemption failed', 500);
    }
});
exports.requestRedemption = requestRedemption;
