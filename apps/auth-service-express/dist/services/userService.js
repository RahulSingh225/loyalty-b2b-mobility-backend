"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const shared_utils_1 = require("@loyalty/shared-utils");
const shared_db_1 = require("@loyalty/shared-db");
const zod_1 = require("zod");
const userZ = zod_1.z.object({
    roleId: zod_1.z.number(),
    name: zod_1.z.string(),
    phone: zod_1.z.string(),
    email: zod_1.z.string().optional(),
});
exports.userService = new shared_utils_1.BaseService(shared_db_1.users, userZ);
