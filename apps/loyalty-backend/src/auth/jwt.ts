import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt';

export const sign = (payload: any, opts?: jwt.SignOptions) => {
  return jwt.sign(payload, getJwtSecret(), opts);
};

export const verify = (token: string) => {
  return jwt.verify(token, getJwtSecret());
};
