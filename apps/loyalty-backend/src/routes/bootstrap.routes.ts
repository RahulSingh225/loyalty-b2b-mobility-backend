import express from 'express';
import path from 'path';
import fs from 'fs';
import { seedMasters } from '../services/bootstrapService';

const router = express.Router();

// Serve the static bootstrap UI
router.get('/', (req, res) => {
  const p = path.join(process.cwd(), 'public', 'bootstrap.html');
  if (!fs.existsSync(p)) return res.status(404).send('Bootstrap UI not found');
  res.sendFile(p);
});

// Run master seeds (guarded via same token/env as admin creation)
router.post('/masters', async (req, res) => {
  try {
    if (process.env.ENABLE_MASTER_BOOTSTRAP !== 'true') return res.status(403).json({ message: 'Bootstrap disabled' });
    const provided = (req.headers['x-bootstrap-token'] || req.body.token) as string | undefined;
    const tokenPath = path.join(process.cwd(), '.bootstrap_token');
    if (!provided) return res.status(401).json({ message: 'Bootstrap token required' });
    if (!fs.existsSync(tokenPath)) return res.status(401).json({ message: 'No bootstrap token available' });
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    if (provided !== token) return res.status(401).json({ message: 'Invalid bootstrap token' });

    const result = await seedMasters();

    // don't remove token here; allow admin creation and other ops until admin created
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'failed' });
  }
});

export default router;
