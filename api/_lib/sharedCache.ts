// api/_lib/sharedCache.ts
// Cache compartilhado entre TODOS os usuários — irmão de
// src/service/PageCache.ts, mas guardado no Firestore (coleção
// `sharedCache`, só o Admin SDK toca nela) em vez de localStorage, já
// que o objetivo aqui é o oposto do cache do client: uma lista como
// "campeões de bilheteria" é a MESMA pra todo mundo, então só precisa
// ser buscada no TMDb UMA vez a cada 7 dias no total, não uma vez por
// navegador/sessão.
//
// Mesma janela de 7 dias do cache do client, por consistência (ver
// PageCache.ts) — pedido original da Rebecca era sobre a experiência do
// usuário ("o cache só fazer reload de 10 em 10 dias", depois ajustado pra 7), que vale igual
// aqui, só que agora o relógio é compartilhado.
import { adminDb } from "./firebaseAdmin.js";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COLLECTION = "sharedCache";

interface CacheDoc<T> {
  data: T;
  cachedAt: number;
}

// Sem FIREBASE_SERVICE_ACCOUNT_KEY o backend ainda responde (busca direto
// no TMDb a cada chamada, sem cache compartilhado) em vez de quebrar —
// útil pra testar `vercel dev` antes de gerar a chave de serviço. Em
// produção isso significa "sem cache", então avisa no log.
const cacheAvailable = (): boolean => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return true;
  console.warn("FIREBASE_SERVICE_ACCOUNT_KEY ausente — cache compartilhado desligado, buscando direto no TMDb.");
  return false;
};

export const getSharedCache = async <T>(key: string): Promise<T | null> => {
  if (!cacheAvailable()) return null;
  const snap = await adminDb().collection(COLLECTION).doc(key).get();
  if (!snap.exists) return null;

  const entry = snap.data() as CacheDoc<T>;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
  return entry.data;
};

export const setSharedCache = async <T>(key: string, data: T): Promise<void> => {
  if (!cacheAvailable()) return;
  const entry: CacheDoc<T> = { data, cachedAt: Date.now() };
  await adminDb().collection(COLLECTION).doc(key).set(entry);
};

// Cache compartilhado primeiro (a não ser com `forceRefresh`); se vazio,
// busca de verdade e grava. `null` = falhou (o client mostra o erro).
export const cachedOrFetch = async <T>(key: string, label: string, forceRefresh: boolean, fetcher: () => Promise<T>): Promise<T | null> => {
  if (!forceRefresh) {
    const cached = await getSharedCache<T>(key);
    if (cached) return cached;
  }
  try {
    const fresh = await fetcher();
    await setSharedCache(key, fresh);
    return fresh;
  } catch (err) {
    console.error(`Erro ao buscar ${label} (backend):`, err);
    return null;
  }
};
