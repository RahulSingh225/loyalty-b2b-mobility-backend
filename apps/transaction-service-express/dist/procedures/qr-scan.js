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
exports.QrScanProcedure = void 0;
const base_1 = require("./base");
const shared_db_1 = require("@loyalty/shared-db");
const zod_1 = require("zod");
const errorHandler_1 = require("../middlewares/errorHandler");
const scanInputSchema = zod_1.z.object({
    qrCode: zod_1.z.string().min(1).max(255),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
class QrScanProcedure extends base_1.Procedure {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const validated = scanInputSchema.parse(this.input);
            yield this.logEvent('SCAN_ATTEMPT', validated.qrCode, { latitude: validated.latitude, longitude: validated.longitude });
            return this.withTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const [qr] = yield tx.select().from(shared_db_1.qrCodes).where((0, shared_db_1.and)((0, shared_db_1.eq)(shared_db_1.qrCodes.code, validated.qrCode), (0, shared_db_1.eq)(shared_db_1.qrCodes.isScanned, false))).for('update of qrCodes').limit(1); // Note: Drizzle supports FOR UPDATE
                if (!qr) {
                    yield this.logEvent('SCAN_FAILED', validated.qrCode, { reason: 'Invalid or scanned' });
                    throw new errorHandler_1.AppError('Invalid or already scanned QR', 400);
                }
                const [config] = yield tx
                    .select({ pointsPerUnit: shared_db_1.skuPointConfig.pointsPerUnit })
                    .from(shared_db_1.skuPointConfig)
                    .innerJoin(shared_db_1.skuVariant, (0, shared_db_1.eq)(shared_db_1.skuVariant.id, shared_db_1.skuPointConfig.skuVariantId))
                    .innerJoin(shared_db_1.skuEntity, (0, shared_db_1.eq)(shared_db_1.skuEntity.id, shared_db_1.skuVariant.skuEntityId))
                    .innerJoin(shared_db_1.users, (0, shared_db_1.eq)(shared_db_1.users.roleId, shared_db_1.skuPointConfig.userTypeId))
                    .where((0, shared_db_1.and)((0, shared_db_1.eq)(shared_db_1.skuEntity.code, qr.sku), (0, shared_db_1.eq)(shared_db_1.users.id, this.userId)))
                    .limit(1);
                const points = (_a = config === null || config === void 0 ? void 0 : config.pointsPerUnit) !== null && _a !== void 0 ? _a : 10;
                yield tx.update(shared_db_1.qrCodes).set({
                    isScanned: true,
                    scannedBy: this.userId,
                }).where((0, shared_db_1.eq)(shared_db_1.qrCodes.id, qr.id));
                const [earningType] = yield tx.select().from(shared_db_1.earningTypes).where((0, shared_db_1.eq)(shared_db_1.earningTypes.name, 'QR Scan')).limit(1);
                yield tx.insert(shared_db_1.retailerTransactions).values({
                    userId: this.userId,
                    earningType: earningType.id,
                    points,
                    category: qr.sku,
                    qrCode: validated.qrCode,
                    latitude: validated.latitude,
                    longitude: validated.longitude,
                    metadata: validated.metadata || {},
                });
                yield tx.update(shared_db_1.users).set((0, shared_db_1.sql) `points_balance = points_balance + ${points}, total_earnings = total_earnings + ${points}`).where((0, shared_db_1.eq)(shared_db_1.users.id, this.userId));
                yield this.logEvent('SCAN_SUCCESS', qr.id, { points });
                return { success: true, points: Number(points), message: 'Scan successful' };
            }));
        });
    }
}
exports.QrScanProcedure = QrScanProcedure;
