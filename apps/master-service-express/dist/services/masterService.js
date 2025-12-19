"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.deleteMaster = exports.updateMaster = exports.createMaster = exports.getMaster = exports.listMasters = void 0;
const shared_db_1 = require("@loyalty/shared-db");
const schema = __importStar(require("@loyalty/shared-db"));
const drizzle_orm_1 = require("drizzle-orm");
// Helper to get table object by string name
const getTable = (tableName) => {
    const table = schema[tableName];
    if (!table)
        throw new Error(`Table ${tableName} not found in schema`);
    return table;
};
const listMasters = (tableName) => __awaiter(void 0, void 0, void 0, function* () {
    const table = getTable(tableName);
    // Default limit 50 for safety
    return shared_db_1.db.select().from(table).limit(50);
});
exports.listMasters = listMasters;
const getMaster = (tableName, id) => __awaiter(void 0, void 0, void 0, function* () {
    const table = getTable(tableName);
    const result = yield shared_db_1.db.select().from(table).where((0, drizzle_orm_1.eq)(table.id, id));
    return result[0];
});
exports.getMaster = getMaster;
const createMaster = (tableName, data) => __awaiter(void 0, void 0, void 0, function* () {
    const table = getTable(tableName);
    const result = yield shared_db_1.db.insert(table).values(data).returning();
    return result[0];
});
exports.createMaster = createMaster;
const updateMaster = (tableName, id, data) => __awaiter(void 0, void 0, void 0, function* () {
    const table = getTable(tableName);
    const result = yield shared_db_1.db.update(table).set(data).where((0, drizzle_orm_1.eq)(table.id, id)).returning();
    return result[0];
});
exports.updateMaster = updateMaster;
const deleteMaster = (tableName, id) => __awaiter(void 0, void 0, void 0, function* () {
    const table = getTable(tableName);
    const result = yield shared_db_1.db.delete(table).where((0, drizzle_orm_1.eq)(table.id, id)).returning();
    return result[0];
});
exports.deleteMaster = deleteMaster;
