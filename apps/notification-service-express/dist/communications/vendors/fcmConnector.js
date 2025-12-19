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
exports.FcmConnector = void 0;
const baseConnector_1 = require("../baseConnector");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let app = null;
const init = () => {
    if (app)
        return app;
    const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!credJson)
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env required');
    const cred = JSON.parse(credJson);
    app = firebase_admin_1.default.initializeApp({ credential: firebase_admin_1.default.credential.cert(cred) });
    return app;
};
class FcmConnector extends baseConnector_1.CommBaseConnector {
    constructor() {
        super();
        this.firebaseApp = init();
    }
    send(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { token, notification, data } = payload;
            const msg = {
                token,
                notification,
                data,
            };
            const resp = yield this.firebaseApp.messaging().send(msg);
            return { ok: true, provider: 'fcm', resp };
        });
    }
}
exports.FcmConnector = FcmConnector;
