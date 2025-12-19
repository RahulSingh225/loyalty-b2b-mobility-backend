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
exports.NodemailerConnector = void 0;
const baseConnector_1 = require("../baseConnector");
const nodemailer_1 = __importDefault(require("nodemailer"));
class NodemailerConnector extends baseConnector_1.CommBaseConnector {
    constructor() {
        super();
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        });
    }
    send(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { to, subject, html, text, from } = payload;
            const info = yield this.transporter.sendMail({ from: from || process.env.SMTP_FROM, to, subject, html, text });
            return { ok: true, provider: 'nodemailer', info };
        });
    }
}
exports.NodemailerConnector = NodemailerConnector;
