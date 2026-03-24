import { Request, Response, NextFunction } from 'express';
import { db, auth, docToData, FieldValue, Timestamp } from '@infrastructure/database/firebase/client';
import { AppError } from '@domain/errors/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  promoverUsuarioSchema,
} from '../validators/schemas';
import type {
  Query,
  QueryDocumentSnapshot,
  DocumentSnapshot,
} from 'firebase-admin/firestore';

type Funcao = 'ADM' | 'PASTOR' | 'DISCIPULADOR' | 'DISCIPULO';

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

      // Determinar IDs permitidos por role
      let allowedIds: string[] | null = null;
      if (userRole === 'PASTOR') {
        allowedIds = await this.getRedeIds(userId);
      } else if (userRole === 'DISCIPULADOR') {
        allowedIds = await this.getCelulaIds(userId);
      } else if (userRole === 'DISCIPULO') {
        allowedIds = [userId];
      }

      if (allowedIds !== null && allowedIds.length === 0) {
        res.json({ data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 });
        return;
      }

      let pagedDocs: QueryDocumentSnapshot[];
      let total: number;

      if (allowedIds !== null) {
        // Non-ADM: buscar por IDs em lotes e filtrar em memória
        const allDocs = await this.fetchDocsByIds('usuarios', allowedIds);

        const filtered = allDocs.filter((doc) => {
          const d = doc.data();
          if (!d.ativo) return false;
          if (funcao && d.funcao !== funcao) return false;
          if (genero && d.genero !== genero) return false;
          if (supervisor_id && d.supervisorId !== supervisor_id) return false;
          if (ministerio_id && d.ministerioId !== ministerio_id) return false;
          if (batizado !== undefined && d.batizado !== (batizado === 'true')) return false;
          return true;
        });

        filtered.sort((a, b) =>
          (a.data().nome as string).localeCompare(b.data().nome as string),
        );

        total = filtered.length;
        pagedDocs = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      } else {
        // ADM: query direta no Firestore
        let query: Query = db.collection('usuarios').where('ativo', '==', true);
        if (funcao) query = query.where('funcao', '==', funcao);
        if (genero) query = query.where('genero', '==', genero);
        if (supervisor_id) query = query.where('supervisorId', '==', supervisor_id);
        if (ministerio_id) query = query.where('ministerioId', '==', ministerio_id);
        if (batizado !== undefined) query = query.where('batizado', '==', batizado === 'true');
        query = query.orderBy('nome');

        const countSnap = await query.count().get();
        total = countSnap.data().count;

        const snap = await query.offset((pageNum - 1) * limitNum).limit(limitNum).get();
        pagedDocs = snap.docs as QueryDocumentSnapshot[];
      }

      // Batch-fetch supervisores, ministérios e contagem de discípulos
      const supervisorIds = [
        ...new Set(pagedDocs.map((d) => d.data().supervisorId).filter(Boolean) as string[]),
      ];
      const ministerioIds = [
        ...new Set(pagedDocs.map((d) => d.data().ministerioId).filter(Boolean) as string[]),
      ];

      const [supervisorMap, ministerioMap, discipulosMap] = await Promise.all([
        this.batchFetchMap('usuarios', supervisorIds),
        this.batchFetchMap('ministerios', ministerioIds),
        this.batchCountDiscipulos(pagedDocs.map((d) => d.id)),
      ]);

      const usuarios = pagedDocs.map((doc) => {
        const d = doc.data();
        return {
          ...docToData(doc),
          supervisor: d.supervisorId
            ? this.supervisorBasic(supervisorMap[d.supervisorId])
            : null,
          ministerio: d.ministerioId ? ministerioMap[d.ministerioId] ?? null : null,
          _count: { discipulos: discipulosMap[doc.id] ?? 0 },
        };
      });

      res.json({ data: usuarios, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;

      const doc = await db.collection('usuarios').doc(id).get();

      if (!doc.exists) {
        throw new AppError('Usuário não encontrado', 404);
      }

      await this.checkPermission(userId, userRole, id);

      const d = doc.data()!;
      const [ministerioDoc, supervisorDoc, discipulosSnap] = await Promise.all([
        d.ministerioId ? db.collection('ministerios').doc(d.ministerioId).get() : Promise.resolve(null),
        d.supervisorId ? db.collection('usuarios').doc(d.supervisorId).get() : Promise.resolve(null),
        db.collection('usuarios').where('supervisorId', '==', id).where('ativo', '==', true)
          .select('id', 'nome', 'email', 'funcao', 'fotoUrl').get(),
      ]);

      const ministerio = ministerioDoc?.exists ? docToData(ministerioDoc) : null;
      const supervisorRaw = supervisorDoc?.exists ? supervisorDoc.data() : null;
      const supervisor = supervisorRaw
        ? { id: supervisorDoc!.id, nome: supervisorRaw.nome, funcao: supervisorRaw.funcao }
        : null;

      const discipulos = discipulosSnap.docs.map((disc) => ({
        id: disc.id,
        nome: disc.data().nome,
        email: disc.data().email,
        funcao: disc.data().funcao,
        fotoUrl: disc.data().fotoUrl ?? null,
      }));

      res.json({
        ...docToData(doc),
        ministerio,
        supervisor,
        discipulos,
        _count: { discipulos: discipulosSnap.size },
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, userRole } = req as AuthRequest;
      const data = createUsuarioSchema.parse(req.body);

      if (userRole === 'DISCIPULO') {
        throw new AppError('Você não tem permissão para criar usuários', 403);
      }

      // Criar usuário no Firebase Auth
      let authUser: Awaited<ReturnType<typeof auth.createUser>>;
      try {
        authUser = await auth.createUser({
          email: data.email,
          password: data.senha,
          displayName: data.nome,
        });
      } catch (err: any) {
        if (err.code === 'auth/email-already-exists') {
          throw new AppError('Já existe um usuário com este email', 409);
        }
        throw err;
      }

      const { senha, ...perfil } = data;

      // Criar documento no Firestore
      const novoDoc: Record<string, unknown> = {
        ...perfil,
        dataNascimento: data.dataNascimento ? Timestamp.fromDate(new Date(data.dataNascimento)) : null,
        ativo: true,
        dataCadastro: FieldValue.serverTimestamp(),
        dataAtualizacao: FieldValue.serverTimestamp(),
      };

      await db.collection('usuarios').doc(authUser.uid).set(novoDoc);

      const criado = await db.collection('usuarios').doc(authUser.uid).get();
      const d = criado.data()!;

      const [supervisorDoc, ministerioDoc] = await Promise.all([
        d.supervisorId ? db.collection('usuarios').doc(d.supervisorId).get() : Promise.resolve(null),
        d.ministerioId ? db.collection('ministerios').doc(d.ministerioId).get() : Promise.resolve(null),
      ]);

      const supervisorRaw = supervisorDoc?.exists ? supervisorDoc.data() : null;
      res.status(201).json({
        ...docToData(criado),
        supervisor: supervisorRaw
          ? { id: supervisorDoc!.id, nome: supervisorRaw.nome, funcao: supervisorRaw.funcao }
          : null,
        ministerio: ministerioDoc?.exists ? docToData(ministerioDoc) : null,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;
      const data = updateUsuarioSchema.parse(req.body);

      await this.checkPermission(userId, userRole, id);

      const updateData: Record<string, unknown> = {
        ...data,
        dataAtualizacao: FieldValue.serverTimestamp(),
      };

      if (data.dataNascimento) {
        updateData.dataNascimento = Timestamp.fromDate(new Date(data.dataNascimento));
      }

      // Sincronizar displayName no Firebase Auth se nome mudou
      if (data.nome) {
        await auth.updateUser(id, { displayName: data.nome });
      }

      await db.collection('usuarios').doc(id).update(updateData);

      const atualizado = await db.collection('usuarios').doc(id).get();
      const d = atualizado.data()!;

      const [supervisorDoc, ministerioDoc] = await Promise.all([
        d.supervisorId ? db.collection('usuarios').doc(d.supervisorId).get() : Promise.resolve(null),
        d.ministerioId ? db.collection('ministerios').doc(d.ministerioId).get() : Promise.resolve(null),
      ]);

      const supervisorRaw = supervisorDoc?.exists ? supervisorDoc.data() : null;
      res.json({
        ...docToData(atualizado),
        supervisor: supervisorRaw
          ? { id: supervisorDoc!.id, nome: supervisorRaw.nome, funcao: supervisorRaw.funcao }
          : null,
        ministerio: ministerioDoc?.exists ? docToData(ministerioDoc) : null,
      });
    } catch (error) {
      next(error);
    }
  }

  async promover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;
      const { novaFuncao, motivo } = promoverUsuarioSchema.parse(req.body);

      const permissoes: Record<string, Funcao[]> = {
        ADM: ['PASTOR', 'DISCIPULADOR', 'DISCIPULO'],
        PASTOR: ['DISCIPULADOR', 'DISCIPULO'],
        DISCIPULADOR: ['DISCIPULO'],
      };

      if (!permissoes[userRole]?.includes(novaFuncao as Funcao)) {
        throw new AppError('Você não tem permissão para esta promoção', 403);
      }

      await this.checkPermission(userId, userRole, id);

      const usuarioSnap = await db.collection('usuarios').doc(id).get();
      if (!usuarioSnap.exists) {
        throw new AppError('Usuário não encontrado', 404);
      }

      const funcaoAnterior = usuarioSnap.data()!.funcao as Funcao;

      // Transação Firestore: atualiza funcao + cria histórico
      await db.runTransaction(async (tx) => {
        tx.update(db.collection('usuarios').doc(id), {
          funcao: novaFuncao,
          dataAtualizacao: FieldValue.serverTimestamp(),
        });
        tx.set(db.collection('historicoFuncoes').doc(), {
          usuarioId: id,
          funcaoAnterior,
          funcaoNova: novaFuncao,
          alteradoPorId: userId,
          dataAlteracao: FieldValue.serverTimestamp(),
          motivo: motivo ?? `Promovido para ${novaFuncao}`,
        });
      });

      const atualizado = await db.collection('usuarios').doc(id).get();
      const d = atualizado.data()!;

      const [supervisorDoc, ministerioDoc] = await Promise.all([
        d.supervisorId ? db.collection('usuarios').doc(d.supervisorId).get() : Promise.resolve(null),
        d.ministerioId ? db.collection('ministerios').doc(d.ministerioId).get() : Promise.resolve(null),
      ]);

      const supervisorRaw = supervisorDoc?.exists ? supervisorDoc.data() : null;
      res.json({
        ...docToData(atualizado),
        supervisor: supervisorRaw
          ? { id: supervisorDoc!.id, nome: supervisorRaw.nome, funcao: supervisorRaw.funcao }
          : null,
        ministerio: ministerioDoc?.exists ? docToData(ministerioDoc) : null,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, userRole } = req as AuthRequest;

      await this.checkPermission(userId, userRole, id);

      // Soft delete: desativa doc no Firestore e conta no Firebase Auth
      await Promise.all([
        db.collection('usuarios').doc(id).update({
          ativo: false,
          dataAtualizacao: FieldValue.serverTimestamp(),
        }),
        auth.updateUser(id, { disabled: true }),
      ]);

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

      if (userId !== id && userRole !== 'ADM') {
        throw new AppError('Você não tem permissão para alterar a senha deste usuário', 403);
      }

      // Se for o próprio usuário, valida senha atual via Firebase Auth REST
      if (userId === id) {
        const userDoc = await db.collection('usuarios').doc(id).get();
        if (!userDoc.exists) throw new AppError('Usuário não encontrado', 404);
        const email = userDoc.data()!.email as string;

        const { signInWithEmailAndPassword: signIn } = await import('@shared/utils/firebaseAuth');
        try {
          await signIn(email, senhaAtual);
        } catch {
          throw new AppError('Senha atual incorreta', 401);
        }
      }

      await auth.updateUser(id, { password: novaSenha });

      res.json({ message: 'Senha atualizada com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Auxiliares ────────────────────────────────────────────────────────────

  /** BFS para obter todos os IDs da rede do pastor (recursivo). */
  private async getRedeIds(userId: string): Promise<string[]> {
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

  /** Retorna o próprio discipulador + seus discípulos diretos. */
  private async getCelulaIds(userId: string): Promise<string[]> {
    const snap = await db
      .collection('usuarios')
      .where('supervisorId', '==', userId)
      .where('ativo', '==', true)
      .select()
      .get();
    return [userId, ...snap.docs.map((d) => d.id)];
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
    } else {
      if (userId !== targetId) {
        throw new AppError('Você não tem permissão para acessar este usuário', 403);
      }
    }
  }

  /** Batch-fetch em lotes de 30 (limite do Firestore). */
  private async fetchDocsByIds(
    collection: string,
    ids: string[],
  ): Promise<QueryDocumentSnapshot[]> {
    if (ids.length === 0) return [];
    const result: QueryDocumentSnapshot[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      const batch = ids.slice(i, i + 30);
      const refs = batch.map((id) => db.collection(collection).doc(id));
      const snaps = await db.getAll(...refs);
      result.push(...(snaps.filter((s) => s.exists) as QueryDocumentSnapshot[]));
    }
    return result;
  }

  /** Retorna um mapa id → dados para batch lookups. */
  private async batchFetchMap(
    collection: string,
    ids: string[],
  ): Promise<Record<string, Record<string, unknown> | null>> {
    if (ids.length === 0) return {};
    const docs = await this.fetchDocsByIds(collection, ids);
    const map: Record<string, Record<string, unknown> | null> = {};
    docs.forEach((doc) => {
      map[doc.id] = docToData(doc);
    });
    return map;
  }

  /** Conta discípulos de uma lista de líderes em lote. */
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

  private supervisorBasic(data: Record<string, unknown> | null | undefined) {
    if (!data) return null;
    return { id: data.id, nome: data.nome, funcao: data.funcao };
  }
}

