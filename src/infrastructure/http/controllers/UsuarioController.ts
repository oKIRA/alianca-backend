import { Request, Response, NextFunction } from 'express';
import { prisma } from '@infrastructure/database/prisma/client';
import { hashPassword, comparePassword } from '@shared/utils/bcrypt';
import { AppError } from '@domain/errors/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createUsuarioSchema, updateUsuarioSchema, promoverUsuarioSchema } from '../validators/schemas';

export class UsuarioController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, userRole } = req as AuthRequest;
      const { 
        funcao, 
        genero, 
        supervisor_id,
        ministerio_id,
        batizado,
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { ativo: true };

      // Filtros de permissão por função
      if (userRole === 'PASTOR') {
        // Pastor vê sua rede
        const rede = await this.getRedeIds(userId);
        where.id = { in: rede };
      } else if (userRole === 'DISCIPULADOR') {
        // Discipulador vê sua célula
        const celula = await this.getCelulaIds(userId);
        where.id = { in: celula };
      } else if (userRole === 'DISCIPULO') {
        // Discípulo vê apenas a si mesmo
        where.id = userId;
      }

      // Aplicar filtros da query
      if (funcao) where.funcao = funcao;
      if (genero) where.genero = genero;
      if (supervisor_id) where.supervisorId = supervisor_id;
      if (ministerio_id) where.ministerioId = ministerio_id;
      if (batizado !== undefined) where.batizado = batizado === 'true';

      const [usuarios, total] = await Promise.all([
        prisma.usuario.findMany({
          where,
          include: {
            supervisor: {
              select: { id: true, nome: true, funcao: true },
            },
            ministerio: true,
            _count: {
              select: { discipulos: true },
            },
          },
          orderBy: { nome: 'asc' },
          skip,
          take: limitNum,
        }),
        prisma.usuario.count({ where }),
      ]);

      const usuariosSemSenha = usuarios.map(({ senhaHash, ...usuario }: any) => usuario);

      res.json({
        data: usuariosSemSenha,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;

      const usuario = await prisma.usuario.findUnique({
        where: { id },
        include: {
          supervisor: {
            select: { id: true, nome: true, funcao: true },
          },
          ministerio: true,
          discipulos: {
            select: {
              id: true,
              nome: true,
              email: true,
              funcao: true,
              fotoUrl: true,
            },
            where: { ativo: true },
          },
          _count: {
            select: { discipulos: true },
          },
        },
      });

      if (!usuario) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Verificar permissão
      await this.checkPermission(userId, userRole, id);

      const { senhaHash, ...usuarioSemSenha } = usuario;

      res.json(usuarioSemSenha);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, userRole } = req as AuthRequest;
      const data = createUsuarioSchema.parse(req.body);

      // Verificar se pode criar usuário
      if (userRole === 'DISCIPULO') {
        throw new AppError('Você não tem permissão para criar usuários', 403);
      }

      // Hash da senha
      const senhaHash = await hashPassword(data.senha);

      const { senha, ...dadosSemSenha } = data;

      const usuario = await prisma.usuario.create({
        data: {
          ...dadosSemSenha,
          senhaHash,
          dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
        },
        include: {
          supervisor: {
            select: { id: true, nome: true, funcao: true },
          },
          ministerio: true,
        },
      });

      const { senhaHash: _, ...usuarioSemSenha } = usuario;

      res.status(201).json(usuarioSemSenha);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;
      const data = updateUsuarioSchema.parse(req.body);

      // Verificar permissão
      await this.checkPermission(userId, userRole, id);

      const usuario = await prisma.usuario.update({
        where: { id },
        data: {
          ...data,
          dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,
        },
        include: {
          supervisor: {
            select: { id: true, nome: true, funcao: true },
          },
          ministerio: true,
        },
      });

      const { senhaHash, ...usuarioSemSenha } = usuario;

      res.json(usuarioSemSenha);
    } catch (error) {
      next(error);
    }
  }

  async promover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;
      const { novaFuncao, motivo } = promoverUsuarioSchema.parse(req.body);

      // Verificar permissão de promoção
      const permissoes: Record<string, string[]> = {
        'ADM': ['PASTOR', 'DISCIPULADOR', 'DISCIPULO'],
        'PASTOR': ['DISCIPULADOR', 'DISCIPULO'],
        'DISCIPULADOR': ['DISCIPULO'],
      };

      if (!permissoes[userRole]?.includes(novaFuncao)) {
        throw new AppError('Você não tem permissão para esta promoção', 403);
      }

      // Verificar se está na rede
      await this.checkPermission(userId, userRole, id);

      const usuarioAtual = await prisma.usuario.findUnique({ where: { id } });

      if (!usuarioAtual) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Criar registro no histórico e atualizar função
      const [usuario] = await prisma.$transaction([
        prisma.usuario.update({
          where: { id },
          data: { funcao: novaFuncao },
          include: {
            supervisor: {
              select: { id: true, nome: true, funcao: true },
            },
            ministerio: true,
          },
        }),
        prisma.historicoFuncao.create({
          data: {
            usuarioId: id,
            funcaoAnterior: usuarioAtual.funcao,
            funcaoNova: novaFuncao,
            alteradoPorId: userId,
            motivo: motivo || `Promovido para ${novaFuncao}`,
          },
        }),
      ]);

      const { senhaHash, ...usuarioSemSenha } = usuario;

      res.json(usuarioSemSenha);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;

      // Verificar permissão
      await this.checkPermission(userId, userRole, id);

      // Soft delete
      await prisma.usuario.update({
        where: { id },
        data: { ativo: false },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async updateSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;
      const { senhaAtual, novaSenha } = req.body;

      // Verificar se é o próprio usuário ou tem permissão
      if (userId !== id && userRole !== 'ADM') {
        throw new AppError('Você não tem permissão para alterar a senha deste usuário', 403);
      }

      const usuario = await prisma.usuario.findUnique({ where: { id } });

      if (!usuario) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Se não for ADM, verificar senha atual
      if (userId === id) {
        const senhaValida = await comparePassword(senhaAtual, usuario.senhaHash);
        if (!senhaValida) {
          throw new AppError('Senha atual incorreta', 401);
        }
      }

      const novaSenhaHash = await hashPassword(novaSenha);

      await prisma.usuario.update({
        where: { id },
        data: { senhaHash: novaSenhaHash },
      });

      res.json({ message: 'Senha atualizada com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  // Métodos auxiliares
  private async getRedeIds(userId: string): Promise<string[]> {
    const result = await prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE rede AS (
        SELECT id FROM usuarios WHERE id = ${userId}
        UNION ALL
        SELECT u.id FROM usuarios u
        INNER JOIN rede r ON u.supervisor_id = r.id
        WHERE u.ativo = true
      )
      SELECT id FROM rede
    `;
    return result.map((r: { id: string }) => r.id);
  }

  private async getCelulaIds(userId: string): Promise<string[]> {
    const discipulos = await prisma.usuario.findMany({
      where: {
        OR: [
          { id: userId },
          { supervisorId: userId },
        ],
        ativo: true,
      },
      select: { id: true },
    });
    return discipulos.map((d: { id: string }) => d.id);
  }

  private async checkPermission(userId: string, userRole: string, targetId: string): Promise<void> {
    if (userRole === 'ADM') return;

    if (userRole === 'PASTOR') {
      const rede = await this.getRedeIds(userId);
      if (!rede.includes(targetId)) {
        throw new AppError('Você não tem permissão para acessar este usuário', 403);
      }
    } else if (userRole === 'DISCIPULADOR') {
      const celula = await this.getCelulaIds(userId);
      if (!celula.includes(targetId)) {
        throw new AppError('Você não tem permissão para acessar este usuário', 403);
      }
    } else if (userRole === 'DISCIPULO') {
      if (userId !== targetId) {
        throw new AppError('Você não tem permissão para acessar este usuário', 403);
      }
    }
  }
}
