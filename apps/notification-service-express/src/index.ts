import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { startNotificationWorker } from './mq/notificationWorker';

// Notification service might be purely a consumer, but let's keep a server for health checks or manual triggers
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'notification-service' });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, async () => {
    console.log(`Notification Service running on :${PORT}`);
    await startNotificationWorker();
    console.log('Notification worker started');
});
