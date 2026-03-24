import { Request, Response, NextFunction } from 'express';
import { auth, db } from '@infrastructure/database/firebase/client';
import { AppError } from '@domain/errors/AppError';

export interface AuthRequest extends Request {
  userId: string;
  userRole: 'ADM' | 'PASTOR' | 'DISCIPULADOR' | 'DISCIPULO';
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Token não fornecido', 401);
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      throw new AppError('Token mal formatado', 401);
    }

    const decoded = await auth.verifyIdToken(token);

    // Buscar funcao atual no Firestore (sempre consistente, sem depender de custom claims)
    const userDoc = await db.collection('usuarios').doc(decoded.uid).get();

    if (!userDoc.exists || !userDoc.data()?.ativo) {
      throw new AppError('Usuário inativo ou não encontrado', 401);
    }

    (req as AuthRequest).userId = decoded.uid;
    (req as AuthRequest).userRole = userDoc.data()!.funcao as AuthRequest['userRole'];

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Token inválido ou expirado', 401));
    }
  }
};
