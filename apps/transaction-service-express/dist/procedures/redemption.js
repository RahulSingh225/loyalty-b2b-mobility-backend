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
exports.RedemptionProcedure = void 0;
const base_1 = require("./base");
const shared_db_1 = require("@loyalty/shared-db");
const zod_1 = require("zod");
const errorHandler_1 = require("../middlewares/errorHandler");
const redemptionInputSchema = zod_1.z.object({
    channelId: zod_1.z.number(),
    pointsRedeemed: zod_1.z.number().positive(),
    amount: zod_1.z.number().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
class RedemptionProcedure extends base_1.Procedure {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const validated = redemptionInputSchema.parse(this.input);
            yield this.logEvent('REDEMPTION_REQUEST', undefined, { points: validated.pointsRedeemed });
            return this.withTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const [user] = yield tx.select({ pointsBalance: shared_db_1.users.address }).from(shared_db_1.users).where((0, shared_db_1.eq)(shared_db_1.users.id, this.userId));
                if (user.pointsBalance < validated.pointsRedeemed) {
                    yield this.logEvent('REDEMPTION_REJECTED', undefined, { reason: 'Insufficient balance' });
                    throw new errorHandler_1.AppError('Insufficient points', 400);
                }
                const [pendingStatus] = yield tx.select().from(shared_db_1.redemptionStatuses).where((0, shared_db_1.eq)(shared_db_1.redemptionStatuses.name, 'Pending'));
                const redemptionId = `RED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const [newRedemption] = yield tx.insert(shared_db_1.redemptions).values({
                    userId: this.userId,
                    redemptionId,
                    channelId: validated.channelId,
                    pointsRedeemed: validated.pointsRedeemed,
                    amount: validated.amount,
                    status: pendingStatus.id,
                    metadata: validated.metadata || {},
                }).returning();
                yield tx.update(shared_db_1.users).set((0, shared_db_1.sql) `points_balance = points_balance - ${validated.pointsRedeemed}`).where((0, shared_db_1.eq)(shared_db_1.users.id, this.userId));
                yield this.logEvent('REDEMPTION_APPROVED', newRedemption.id, { redemptionId });
                return { success: true, redemptionId, message: 'Redemption requested' };
            }));
        });
    }
}
exports.RedemptionProcedure = RedemptionProcedure;
