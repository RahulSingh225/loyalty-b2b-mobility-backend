import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import userRoutes from './routes/user.routes';
import redemptionRoutes from './routes/redemption.routes';
import { authenticate } from './middlewares/auth';

const app = express();
app.use(cors());
app.use(express.json());

// Swagger
const swaggerDoc = yaml.load(fs.readFileSync('../swagger.yaml', 'utf8')) as any;
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', authenticate, transactionRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/redemptions', authenticate, redemptionRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
