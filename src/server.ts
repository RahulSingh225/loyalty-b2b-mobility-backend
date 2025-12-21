import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import 'dotenv/config';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import userRoutes from './routes/user.routes';
import redemptionRoutes from './routes/redemption.routes';
import { authenticate } from './middlewares/auth';
import { userService } from './services/userService';
import { initMQ } from './mq/mqService';
import { initMasters, scheduleMasterRefresh } from './utils/masterCache';
import masterRoutes from './routes/master.routes';
import adminRoutes from './routes/admin.routes';
import bootstrapRoutes from './routes/bootstrap.routes';
import onboardingRoutes from './routes/onboarding.routes';
import earningRoutes from './routes/earning.routes';
import ticketRoutes from './routes/ticket.routes';
import creativeRoutes from './routes/creative.routes';
import kycRoutes from './routes/kyc.routes';
import tdsRoutes from './routes/tds.routes';

import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Swagger
// const swaggerDoc = yaml.load(fs.readFileSync('../swagger.yaml', 'utf8')) as any;
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', authenticate, transactionRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/redemptions', authenticate, redemptionRoutes);

app.use('/api/v1/masters', masterRoutes);
app.use('/api/v1/admin', adminRoutes);
// serve public static files (bootstrap UI)
app.use('/bootstrap', express.static(path.join(process.cwd(), 'public')));
app.use('/api/v1/bootstrap', bootstrapRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/earning', earningRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/creatives', creativeRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/tds', tdsRoutes);

// Example: expose a simple user CRUD endpoint for the base service (dev/demo only)
app.get('/debug/users', async (_req, res) => {
	const users = await userService.findManyPaginated();
	res.json(users);
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));

// initialize MQ connector (noop if DRIVER not configured)
initMQ();

// initialize cached masters
initMasters().catch((err) => console.error('initMasters failed', JSON.stringify(err)));
// schedule background refresh every hour
scheduleMasterRefresh(1000 * 60 * 60);

