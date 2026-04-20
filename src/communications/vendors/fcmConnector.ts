import { CommBaseConnector } from '../baseConnector';
import admin from 'firebase-admin';
import * as credJson from "../../config/sturlite-loyalty-firebase-google-service-backend.json"
let app: admin.app.App | null = null;

const init = () => {
  if (app) return app;
  if (!credJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env required');
  app = admin.initializeApp({ credential: admin.credential.cert(credJson as admin.ServiceAccount) });
  return app;
};

export class FcmConnector extends CommBaseConnector {
  private firebaseApp: admin.app.App;

  constructor() {
    super();
    this.firebaseApp = init();
  }

  async send(payload: any) {
    const { token, notification, data } = payload;
    const msg: admin.messaging.Message = {
      token,
      notification,
      data,
    };
    const resp = await this.firebaseApp.messaging().send(msg);
    return { ok: true, provider: 'fcm', resp };
  }
}

