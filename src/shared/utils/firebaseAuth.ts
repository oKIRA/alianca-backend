import { env } from '@config/env';
import { AppError } from '@domain/errors/AppError';

interface SignInResult {
  idToken: string;
  refreshToken: string;
  uid: string;
}

/**
 * Autentica email/senha via Firebase Auth REST API e retorna o ID token.
 * Utilizado pelo endpoint /auth/login do backend.
 */
export async function signInWithEmailAndPassword(
  email: string,
  password: string,
): Promise<SignInResult> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!response.ok) {
    const body = (await response.json()) as { error?: { message?: string } };
    const msg = body?.error?.message ?? '';
    if (
      msg.includes('EMAIL_NOT_FOUND') ||
      msg.includes('INVALID_PASSWORD') ||
      msg.includes('INVALID_LOGIN_CREDENTIALS') ||
      msg.includes('INVALID_EMAIL')
    ) {
      throw new AppError('Credenciais inválidas', 401);
    }
    if (msg.includes('USER_DISABLED')) {
      throw new AppError('Credenciais inválidas', 401);
    }
    throw new AppError('Credenciais inválidas', 401);
  }

  const data = (await response.json()) as {
    idToken: string;
    refreshToken: string;
    localId: string;
  };

  return { idToken: data.idToken, refreshToken: data.refreshToken, uid: data.localId };
}
