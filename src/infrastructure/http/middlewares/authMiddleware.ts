import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@shared/utils/jwt';
import { AppError } from '@domain/errors/AppError';

export interface AuthRequest extends Request {
  userId: string;
  userRole: 'ADM' | 'PASTOR' | 'DISCIPULADOR' | 'DISCIPULO';
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Token não fornecido', 401);
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      throw new AppError('Token mal formatado', 401);
    }

    const decoded = verifyToken(token);

    (req as AuthRequest).userId = decoded.userId;
    (req as AuthRequest).userRole = decoded.funcao;

    next();
  } catch (error) {
    next(new AppError('Token inválido ou expirado', 401));
  }
};
