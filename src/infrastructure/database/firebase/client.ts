import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { env } from '@config/env';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export const db = getFirestore();
export const auth = getAuth();
export { Timestamp, FieldValue };

/** Converte um DocumentSnapshot para objeto plain-JS, transformando Timestamps em ISO strings. */
export function docToData(
  doc: FirebaseFirestore.DocumentSnapshot,
): Record<string, unknown> | null {
  if (!doc.exists) return null;
  const raw = doc.data()!;
  const result: Record<string, unknown> = { id: doc.id };
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === 'object' && typeof (value as any).toDate === 'function') {
      result[key] = (value as any).toDate().toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}
