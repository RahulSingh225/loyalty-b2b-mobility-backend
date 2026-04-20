import jwt, { SignOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || SECRET;

export const signAccessToken = (payload: any, expiresIn = '30d'): string => {
	return jwt.sign(payload, SECRET, { expiresIn } as SignOptions);
};

export const verifyAccessToken = (token: string) => {
	return jwt.verify(token, SECRET) as any;
};

export const signRefreshToken = (payload: any, expiresIn = '30d') => {
	return jwt.sign(payload, REFRESH_SECRET, { expiresIn } as SignOptions);
};

export const verifyRefreshToken = (token: string) => {
	return jwt.verify(token, REFRESH_SECRET) as any;
};
