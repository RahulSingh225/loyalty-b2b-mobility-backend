import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { startNotificationWorker } from './mq/notificationWorker';

@Injectable()
export class NotificationService implements OnModuleInit {
    private readonly logger = new Logger(NotificationService.name);

    async onModuleInit() {
        this.logger.log('Starting notification worker...');
        await startNotificationWorker();
        this.logger.log('Notification worker started.');
    }
}
