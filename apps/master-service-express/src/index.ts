import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import masterRoutes from './routes/master.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/masters', masterRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Master Service running on :${PORT}`));
