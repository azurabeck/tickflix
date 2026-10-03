// api/_lib/firebaseAdmin.ts
// Firebase Admin (não o SDK client do src/service/FirebaseSettings.ts) —
// único jeito de ler/escrever Firestore a partir do backend, ignorando as
// regras de segurança (firestore.rules), que valem só pro SDK client. É
// quem guarda o cache compartilhado (api/_lib/sharedCache.ts) — uma
// collection que NENHUM client lê/escreve direto, por isso não precisa
// de regra nenhuma em firestore.rules.
//
// Credencial: uma única variável de ambiente `FIREBASE_SERVICE_ACCOUNT_KEY`
// com o JSON inteiro da chave de serviço (gerada em
// console.firebase.google.com → Configurações do projeto → Contas de
// serviço → Gerar nova chave privada), colada como string numa linha só.
// Nunca comite esse arquivo/valor — mesmo tratamento do resto do .env.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const getAdminApp = () => {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY não configurada nas variáveis de ambiente do servidor.");
  }

  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
};

export const adminDb = () => getFirestore(getAdminApp());
