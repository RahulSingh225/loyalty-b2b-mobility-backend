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
exports.register = exports.login = void 0;
const jwt_1 = require("../config/jwt");
const shared_db_1 = require("@loyalty/shared-db");
const response_1 = require("../utils/response");
const redis_1 = require("../config/redis");
const userService_1 = require("../services/userService");
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, password } = req.body;
    const [user] = yield userService_1.userService.findOne((0, shared_db_1.eq)(shared_db_1.users.phone, phone));
    if (!user || user.password !== password) { // In prod, hash passwords
        return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
    }
    const token = (0, jwt_1.signToken)({ userId: user.id });
    // create server session id in redis
    const sessionId = `sess:${user.id}:${Date.now()}`;
    yield redis_1.redis.set(sessionId, JSON.stringify({ userId: user.id }), { EX: 60 * 60 * 24 * 7 });
    res.json((0, response_1.success)({ token, sessionId, user: { id: user.id, name: user.name } }));
});
exports.login = login;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Simplified; add full validation
    const userData = req.body;
    const [newUser] = yield shared_db_1.db.insert(shared_db_1.users).values(userData).returning();
    const token = (0, jwt_1.signToken)({ userId: newUser.id });
    res.status(201).json((0, response_1.success)({ token, user: newUser }));
});
exports.register = register;
