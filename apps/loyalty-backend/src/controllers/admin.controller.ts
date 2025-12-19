import { Request, Response } from 'express';
import { createMasterAdmin, masterAdminExists } from '../services/adminService';
import fs from 'fs';
import path from 'path';

const TOKEN_PATH = path.join(process.cwd(), '.bootstrap_token');

export const createMasterAdminHandler = async (req: Request, res: Response) => {
  try {
    // require a guard env to be explicitly set
    if (process.env.ENABLE_MASTER_BOOTSTRAP !== 'true') return res.status(403).json({ message: 'Bootstrap disabled' });

    // require one-time token header
    const provided = (req.headers['x-bootstrap-token'] || req.body.token) as string | undefined;
    if (!provided) return res.status(401).json({ message: 'Bootstrap token required' });

    if (!fs.existsSync(TOKEN_PATH)) return res.status(401).json({ message: 'No bootstrap token available' });
    const token = fs.readFileSync(TOKEN_PATH, 'utf8').trim();
    if (provided !== token) return res.status(401).json({ message: 'Invalid bootstrap token' });

    const exists = await masterAdminExists();
    if (exists) return res.status(403).json({ message: 'Master admin already exists' });
    const { name, email, phone, password, clientId } = req.body;
    if (!name || !email || !password || !phone) return res.status(400).json({ message: 'name, email, phone and password required' });
    const user = await createMasterAdmin({ name, email, phone, password, clientId });

    // invalidate token after successful use
    try { fs.unlinkSync(TOKEN_PATH); } catch (e) { /* ignore */ }

    res.json({ ok: true, user });
  } catch (err: any) {
    console.error('createMasterAdminHandler error', err);
    res.status(500).json({ message: err.message || 'failed' });
  }
};

export default { createMasterAdminHandler };
