import { Request, Response, NextFunction } from 'express';
import { AppError } from '@domain/errors/AppError';
import { ZodError, ZodIssue } from 'zod';

interface PrismaError extends Error {
  code: string;
  meta?: Record<string, unknown>;
  clientVersion: string;
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

  // Erros do Prisma (usando duck typing)
  const prismaError = error as PrismaError;
  if (prismaError.code && prismaError.clientVersion) {
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        status: 'error',
        message: 'Já existe um registro com esses dados únicos',
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        status: 'error',
        message: 'Registro não encontrado',
      });
      return;
    }
  }

  console.error('❌ Erro não tratado:', error);

  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : error.message,
  });
};
