import { Request, Response, NextFunction } from 'express';
import { db, auth, docToData } from '@infrastructure/database/firebase/client';
import { AppError } from '@domain/errors/AppError';
import { loginSchema } from '../validators/schemas';
import { AuthRequest } from '../middlewares/authMiddleware';
import { signInWithEmailAndPassword } from '@shared/utils/firebaseAuth';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, senha } = loginSchema.parse(req.body);

      // Autentica via Firebase Auth REST API — obtém o ID token
      const authResult = await signInWithEmailAndPassword(email, senha);

      // Verifica se o perfil existe e está ativo no Firestore
      const usuarioDoc = await db.collection('usuarios').doc(authResult.uid).get();

      if (!usuarioDoc.exists || !usuarioDoc.data()?.ativo) {
        throw new AppError('Credenciais inválidas', 401);
      }

      const usuarioData = usuarioDoc.data()!;

      // Buscar ministério vinculado
      let ministerio: Record<string, unknown> | null = null;
      if (usuarioData.ministerioId) {
        const minDoc = await db.collection('ministerios').doc(usuarioData.ministerioId).get();
        if (minDoc.exists) {
          ministerio = docToData(minDoc);
        }
      }

      res.json({
        token: authResult.idToken,
        usuario: {
          id: authResult.uid,
          nome: usuarioData.nome,
          email: usuarioData.email,
          funcao: usuarioData.funcao,
          fotoUrl: usuarioData.fotoUrl ?? null,
          ministerio,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req as AuthRequest;

      const usuarioDoc = await db.collection('usuarios').doc(userId).get();

      if (!usuarioDoc.exists) {
        throw new AppError('Usuário não encontrado', 404);
      }

      const usuarioData = usuarioDoc.data()!;

      const [ministerioDoc, supervisorDoc] = await Promise.all([
        usuarioData.ministerioId
          ? db.collection('ministerios').doc(usuarioData.ministerioId).get()
          : Promise.resolve(null),
        usuarioData.supervisorId
          ? db.collection('usuarios').doc(usuarioData.supervisorId).get()
          : Promise.resolve(null),
      ]);

      const ministerio = ministerioDoc?.exists ? docToData(ministerioDoc) : null;
      const supervisorRaw = supervisorDoc?.exists ? supervisorDoc.data() : null;
      const supervisor = supervisorRaw
        ? { id: supervisorDoc!.id, nome: supervisorRaw.nome, funcao: supervisorRaw.funcao }
        : null;

      res.json({ ...docToData(usuarioDoc), ministerio, supervisor });
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    // Firebase Auth tokens são stateless — logout é feito no cliente
    res.json({ message: 'Logout realizado com sucesso' });
  }
}
