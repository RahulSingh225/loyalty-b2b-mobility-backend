import { Request, Response } from 'express';
import { listMasters, getMaster, createMaster, updateMaster, deleteMaster, getPincodeData } from '../services/masterService';
import { success } from '../utils/response';

export const getPincode = async (req: Request, res: Response) => {
  const { pincode } = req.params;
  const data = await getPincodeData(pincode);
  if (!data) {
    res.status(404).json({ success: false, error: { message: 'Pincode not found' } });
    return;
  }
  res.json(success(data));
};

export const list = async (req: Request, res: Response) => {
  const { table } = req.params as any;
  const data = await listMasters(table);
  res.json(success(data));
};

export const getOne = async (req: Request, res: Response) => {
  const { table, id } = req.params as any;
  const data = await getMaster(table, Number(id));
  res.json(success(data));
};

export const create = async (req: Request, res: Response) => {
  const { table } = req.params as any;
  const created = await createMaster(table, req.body);
  res.status(201).json(success(created));
};

export const update = async (req: Request, res: Response) => {
  const { table, id } = req.params as any;
  const updated = await updateMaster(table, Number(id), req.body);
  res.json(success(updated));
};

export const remove = async (req: Request, res: Response) => {
  const { table, id } = req.params as any;
  try {
    const deleted = await deleteMaster(table, Number(id));
    res.json(success(deleted));
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
};
