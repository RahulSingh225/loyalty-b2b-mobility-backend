import { CommBaseConnector } from '../baseConnector';
import admin from 'firebase-admin';

let app: admin.app.App | null = null;

const init = () => {
  if (app) return app;
  const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env required');
  const cred = JSON.parse(credJson);
  app = admin.initializeApp({ credential: admin.credential.cert(cred) });
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

