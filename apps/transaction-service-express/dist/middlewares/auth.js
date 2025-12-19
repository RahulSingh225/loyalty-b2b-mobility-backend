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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
// import { verifyToken } from '../config/jwt'; // We will mock or copy this
const shared_db_1 = require("@loyalty/shared-db");
const redis_1 = require("../config/redis");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
};
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];
    const sessionId = req.headers['x-session-id']; // cookies support removed for simplicity in microservice
    // API key
    if (apiKey && apiKey === process.env.API_KEY) {
        req.auth = { type: 'apikey' };
        return next();
    }
    // JWT
    if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const payload = verifyToken(token);
            const [user] = yield shared_db_1.db.select().from(shared_db_1.users).where((0, shared_db_1.eq)(shared_db_1.users.id, payload.userId)).limit(1);
            if (!user)
                return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
            req.user = user;
            req.auth = { type: 'jwt' };
            return next();
        }
        catch (err) {
            return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
        }
    }
    // Session (Redis)
    if (sessionId) {
        try {
            const raw = yield redis_1.redis.get(String(sessionId));
            if (!raw)
                return res.status(401).json({ success: false, error: { message: 'Invalid session' } });
            const session = JSON.parse(raw);
            const [user] = yield shared_db_1.db.select().from(shared_db_1.users).where((0, shared_db_1.eq)(shared_db_1.users.id, session.userId)).limit(1);
            if (!user)
                return res.status(401).json({ success: false, error: { message: 'Invalid session' } });
            req.user = user;
            req.auth = { type: 'session' };
            return next();
        }
        catch (err) {
            return res.status(401).json({ success: false, error: { message: 'Invalid session' } });
        }
    }
    return res.status(401).json({ success: false, error: { message: 'No credentials provided' } });
});
exports.authenticate = authenticate;
