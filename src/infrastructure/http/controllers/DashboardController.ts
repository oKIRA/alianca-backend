import { Request, Response, NextFunction } from 'express';
import { db, docToData } from '@infrastructure/database/firebase/client';
import { AppError } from '@domain/errors/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export class DashboardController {
  async getEstatisticas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, userRole } = req as AuthRequest;
      const { filtro_genero, filtro_idade_min, filtro_idade_max } = req.query;

      // Obter IDs da rede conforme função
      const redeIds = await this.getRedeIds(userId, userRole);

      if (redeIds.length === 0) {
        res.json(this.emptyStats());
        return;
      }

      // Buscar documentos em lotes de 30
      const usuarios = await this.fetchBatch(redeIds);

      // Filtros em memória (datas e genero não podem ser combinados em Firestore sem índice)
      const hoje = new Date();
      const filtered = usuarios.filter((u) => {
        if (filtro_genero && u.genero !== filtro_genero) return false;

        if (filtro_idade_min || filtro_idade_max) {
          const idade = this.calcularIdade(u.dataNascimento);
          if (filtro_idade_min && idade < parseInt(filtro_idade_min as string)) return false;
          if (filtro_idade_max && idade > parseInt(filtro_idade_max as string)) return false;
        }

        return true;
      });

      const total = filtered.length;
      const g12Diretos = filtered.filter((u) => u.supervisorId === userId).length;

      const batizados = filtered.filter((u) => u.batizado).length;
      const universidadeVida = filtered.filter((u) => u.universidadeVida).length;
      const cd1 = filtered.filter((u) => u.capacitacaoDestino1).length;
      const cd2 = filtered.filter((u) => u.capacitacaoDestino2).length;
      const cd3 = filtered.filter((u) => u.capacitacaoDestino3).length;

      const homens = filtered.filter((u) => u.genero === 'M').length;
      const mulheres = filtered.filter((u) => u.genero === 'F').length;

      const faixasEtarias: Record<string, number> = {
        '0-12': 0, '13-17': 0, '18-25': 0,
        '26-35': 0, '36-50': 0, '51+': 0,
      };

      filtered.forEach((u) => {
        const idade = this.calcularIdade(u.dataNascimento);
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

      const usuarioDoc = await db.collection('usuarios').doc(userId).get();
      if (!usuarioDoc.exists) {
        throw new AppError('Usuário não encontrado', 404);
      }

      const discipulosSnap = await db
        .collection('usuarios')
        .where('supervisorId', '==', userId)
        .where('ativo', '==', true)
        .orderBy('nome')
        .get();

      // Contar discípulos de cada discipulador em lote
      const discipuloIds = discipulosSnap.docs.map((d) => d.id);
      const contagens = await this.batchCountDiscipulos(discipuloIds);

      const discipulosDirectos = discipulosSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          nome: d.nome,
          email: d.email,
          funcao: d.funcao,
          fotoUrl: d.fotoUrl ?? null,
          total_discipulos: contagens[doc.id] ?? 0,
        };
      });

      const u = usuarioDoc.data()!;
      res.json({
        usuario: {
          id: userId,
          nome: u.nome,
          email: u.email,
          funcao: u.funcao,
          fotoUrl: u.fotoUrl ?? null,
        },
        discipulos_diretos: discipulosDirectos,
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Auxiliares ────────────────────────────────────────────────────────────

  private async getRedeIds(userId: string, userRole: string): Promise<string[]> {
    if (userRole === 'ADM') {
      const snap = await db.collection('usuarios').where('ativo', '==', true).select().get();
      return snap.docs.map((d) => d.id);
    }
    if (userRole === 'PASTOR') {
      return this.getRedeRecursiva(userId);
    }
    if (userRole === 'DISCIPULADOR') {
      const snap = await db
        .collection('usuarios')
        .where('supervisorId', '==', userId)
        .where('ativo', '==', true)
        .select()
        .get();
      return [userId, ...snap.docs.map((d) => d.id)];
    }
    return [userId];
  }

  /** BFS para montar toda a rede descendente. */
  private async getRedeRecursiva(userId: string): Promise<string[]> {
    const ids: string[] = [userId];
    const queue: string[] = [userId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const snap = await db
        .collection('usuarios')
        .where('supervisorId', '==', current)
        .where('ativo', '==', true)
        .select()
        .get();
      for (const doc of snap.docs) {
        ids.push(doc.id);
        queue.push(doc.id);
      }
    }
    return ids;
  }

  /** Busca documentos de usuário em lotes, retornando dados plain. */
  private async fetchBatch(ids: string[]): Promise<Record<string, any>[]> {
    const result: Record<string, any>[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      const batch = ids.slice(i, i + 30);
      const refs = batch.map((id) => db.collection('usuarios').doc(id));
      const snaps = await db.getAll(...refs);
      snaps.forEach((snap) => {
        if (snap.exists) {
          const d = snap.data()!;
          result.push({
            id: snap.id,
            genero: d.genero,
            dataNascimento: d.dataNascimento?.toDate?.() ?? null,
            batizado: d.batizado,
            universidadeVida: d.universidadeVida,
            capacitacaoDestino1: d.capacitacaoDestino1,
            capacitacaoDestino2: d.capacitacaoDestino2,
            capacitacaoDestino3: d.capacitacaoDestino3,
            supervisorId: d.supervisorId ?? null,
          });
        }
      });
    }
    return result;
  }

  private async batchCountDiscipulos(ids: string[]): Promise<Record<string, number>> {
    if (ids.length === 0) return {};
    const counts: Record<string, number> = {};
    ids.forEach((id) => (counts[id] = 0));
    for (let i = 0; i < ids.length; i += 30) {
      const batch = ids.slice(i, i + 30);
      const snap = await db
        .collection('usuarios')
        .where('supervisorId', 'in', batch)
        .where('ativo', '==', true)
        .select('supervisorId')
        .get();
      snap.docs.forEach((doc) => {
        const supId = doc.data().supervisorId as string;
        if (supId && counts[supId] !== undefined) counts[supId]++;
      });
    }
    return counts;
  }

  private calcularIdade(dataNascimento: Date | null): number {
    if (!dataNascimento) return 0;
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const mes = hoje.getMonth() - dataNascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNascimento.getDate())) {
      idade--;
    }
    return idade;
  }

  private emptyStats() {
    return {
      totais: { discipulos: 0, g12_diretos: 0, celula: 0, rede_completa: 0 },
      espirituais: {
        batizados: 0, universidade_vida: 0,
        capacitacao_destino_1: 0, capacitacao_destino_2: 0, capacitacao_destino_3: 0,
      },
      demograficos: {
        homens: 0, mulheres: 0,
        faixas_etarias: { '0-12': 0, '13-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '51+': 0 },
      },
    };
  }
}

