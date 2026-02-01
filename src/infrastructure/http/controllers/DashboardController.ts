import { Request, Response, NextFunction } from 'express';
import { prisma } from '@infrastructure/database/prisma/client';
import { AppError } from '@domain/errors/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';

export class DashboardController {
  async getEstatisticas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, userRole } = req as AuthRequest;
      const { filtro_genero, filtro_idade_min, filtro_idade_max } = req.query;

      // Obter IDs da rede baseado na função
      let redeIds: string[];
      if (userRole === 'ADM') {
        const todos = await prisma.usuario.findMany({
          where: { ativo: true },
          select: { id: true },
        });
        redeIds = todos.map((u: { id: string }) => u.id);
      } else if (userRole === 'PASTOR') {
        redeIds = await this.getRedeIds(userId);
      } else if (userRole === 'DISCIPULADOR') {
        redeIds = await this.getCelulaIds(userId);
      } else {
        redeIds = [userId];
      }

      // Construir filtros
      const where: any = {
        id: { in: redeIds },
        ativo: true,
      };

      if (filtro_genero) {
        where.genero = filtro_genero;
      }

      if (filtro_idade_min || filtro_idade_max) {
        const hoje = new Date();
        if (filtro_idade_max) {
          const minDate = new Date(hoje.getFullYear() - parseInt(filtro_idade_max as string), hoje.getMonth(), hoje.getDate());
          where.dataNascimento = { gte: minDate };
        }
        if (filtro_idade_min) {
          const maxDate = new Date(hoje.getFullYear() - parseInt(filtro_idade_min as string), hoje.getMonth(), hoje.getDate());
          where.dataNascimento = { ...where.dataNascimento, lte: maxDate };
        }
      }

      // Buscar usuários com filtros
      const usuarios = await prisma.usuario.findMany({
        where,
        select: {
          id: true,
          genero: true,
          dataNascimento: true,
          batizado: true,
          universidadeVida: true,
          capacitacaoDestino1: true,
          capacitacaoDestino2: true,
          capacitacaoDestino3: true,
          supervisorId: true,
        },
      });

      // Calcular estatísticas
      const total = usuarios.length;
      const g12Diretos = usuarios.filter(u => u.supervisorId === userId).length;
      
      const batizados = usuarios.filter(u => u.batizado).length;
      const universidadeVida = usuarios.filter(u => u.universidadeVida).length;
      const cd1 = usuarios.filter(u => u.capacitacaoDestino1).length;
      const cd2 = usuarios.filter(u => u.capacitacaoDestino2).length;
      const cd3 = usuarios.filter(u => u.capacitacaoDestino3).length;

      const homens = usuarios.filter(u => u.genero === 'M').length;
      const mulheres = usuarios.filter(u => u.genero === 'F').length;

      // Calcular faixas etárias
      const calcularIdade = (dataNascimento: Date | null): number => {
        if (!dataNascimento) return 0;
        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNascimento.getFullYear();
        const mes = hoje.getMonth() - dataNascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < dataNascimento.getDate())) {
          idade--;
        }
        return idade;
      };

      const faixasEtarias = {
        '0-12': 0,
        '13-17': 0,
        '18-25': 0,
        '26-35': 0,
        '36-50': 0,
        '51+': 0,
      };

      usuarios.forEach(u => {
        const idade = calcularIdade(u.dataNascimento);
        if (idade <= 12) faixasEtarias['0-12']++;
        else if (idade <= 17) faixasEtarias['13-17']++;
        else if (idade <= 25) faixasEtarias['18-25']++;
        else if (idade <= 35) faixasEtarias['26-35']++;
        else if (idade <= 50) faixasEtarias['36-50']++;
        else faixasEtarias['51+']++;
      });

      res.json({
        totais: {
          discipulos: total,
          g12_diretos: g12Diretos,
          celula: userRole === 'DISCIPULADOR' ? total : 0,
          rede_completa: total,
        },
        espirituais: {
          batizados,
          universidade_vida: universidadeVida,
          capacitacao_destino_1: cd1,
          capacitacao_destino_2: cd2,
          capacitacao_destino_3: cd3,
        },
        demograficos: {
          homens,
          mulheres,
          faixas_etarias: faixasEtarias,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getHierarquia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req as AuthRequest;

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nome: true,
          email: true,
          funcao: true,
          fotoUrl: true,
        },
      });

      if (!usuario) {
        throw new AppError('Usuário não encontrado', 404);
      }

      const discipulosDirectos = await prisma.usuario.findMany({
        where: {
          supervisorId: userId,
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          funcao: true,
          fotoUrl: true,
          _count: {
            select: { discipulos: true },
          },
        },
        orderBy: { nome: 'asc' },
      });

      res.json({
        usuario,
        discipulos_diretos: discipulosDirectos.map((d: any) => ({
          ...d,
          total_discipulos: d._count.discipulos,
        })),
      });
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
}
