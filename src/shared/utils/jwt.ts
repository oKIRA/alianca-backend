import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '@config/env';

export interface JwtPayload {
  userId: string;
  funcao: 'ADM' | 'PASTOR' | 'DISCIPULADOR' | 'DISCIPULO';
}

export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
};
