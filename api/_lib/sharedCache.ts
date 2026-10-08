import { adminDb } from "./firebaseAdmin.js";

// Cache compartilhado entre todos os usuários, no Firestore: a primeira visita
// busca no TMDb e salva; as seguintes leem daqui por até 7 dias.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COLLECTION = "sharedCache";

interface CacheDoc<T> {
  data: T;
  cachedAt: number;
}

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
