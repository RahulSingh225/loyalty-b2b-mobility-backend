import { CommBaseConnector } from './baseConnector';

export class NotificationService {
  constructor(private connector: CommBaseConnector) {}

  async notify(userId: string, payload: any) {
    return this.connector.send({ userId, payload });
  }
}
