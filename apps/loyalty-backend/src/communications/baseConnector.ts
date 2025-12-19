export abstract class CommBaseConnector {
  abstract send(payload: any): Promise<any>;
}
