import { Request, Response, NextFunction } from 'express';
import { prisma } from '@infrastructure/database/prisma/client';
import { comparePassword } from '@shared/utils/bcrypt';
import { generateToken } from '@shared/utils/jwt';
import { AppError } from '@domain/errors/AppError';
import { loginSchema } from '../validators/schemas';
import { AuthRequest } from '../middlewares/authMiddleware';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, senha } = loginSchema.parse(req.body);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
        include: {
          ministerio: true,
        },
      });

      if (!usuario || !usuario.ativo) {
        throw new AppError('Credenciais inválidas', 401);
      }

      const senhaValida = await comparePassword(senha, usuario.senhaHash);

      if (!senhaValida) {
        throw new AppError('Credenciais inválidas', 401);
      }

      const token = generateToken({
        userId: usuario.id,
        funcao: usuario.funcao,
      });

      res.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          funcao: usuario.funcao,
          fotoUrl: usuario.fotoUrl,
          ministerio: usuario.ministerio,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req as AuthRequest;

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        include: {
          ministerio: true,
          supervisor: {
            select: {
              id: true,
              nome: true,
              funcao: true,
            },
          },
        },
      });

      if (!usuario) {
        throw new AppError('Usuário não encontrado', 404);
      }

      const { senhaHash, ...usuarioSemSenha } = usuario;

      res.json(usuarioSemSenha);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    // No caso de JWT, logout é feito no frontend removendo o token
    res.json({ message: 'Logout realizado com sucesso' });
  }
}
