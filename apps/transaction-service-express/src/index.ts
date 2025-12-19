import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import transactionRoutes from './routes/transaction.routes';
import redemptionRoutes from './routes/redemption.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/transactions', transactionRoutes);
app.use('/redemptions', redemptionRoutes);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Transaction Service running on :${PORT}`));
