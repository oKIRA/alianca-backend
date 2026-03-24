import { Request, Response, NextFunction } from 'express';
import { AppError } from '@domain/errors/AppError';
import { ZodError, ZodIssue } from 'zod';

interface FirebaseError extends Error {
  code: string;
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  // Erros de validação Zod
  if (error instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Dados inválidos',
      errors: error.issues.map((err: ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  // Erros do Firebase Admin
  const fbError = error as FirebaseError;
  if (fbError.code && typeof fbError.code === 'string' && fbError.code.startsWith('auth/')) {
    if (fbError.code === 'auth/email-already-exists') {
      res.status(409).json({ status: 'error', message: 'Este email já está cadastrado' });
      return;
    }
    if (fbError.code === 'auth/user-not-found') {
      res.status(404).json({
        status: 'error',
        message: 'Usuário não encontrado no sistema de autenticação',
      });
      return;
    }
    // Fallback genérico para outros erros do Firebase Auth
    res.status(400).json({ status: 'error', message: fbError.message || 'Erro de autenticação' });
    return;
  }

  console.error('❌ Erro não tratado:', error);

  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : error.message,
  });
};
