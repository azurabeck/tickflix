// Cache das páginas no localStorage, separado por usuário e válido por 7 dias.
// requestRefresh() avisa que os dados mudaram; cada página consome esse aviso
// uma vez (consumeRefreshRequest) e busca tudo de novo.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const REFRESH_TOKEN_KEY = "tickflix-refresh-token";
const consumedKey = (page: string): string => `tickflix-refresh-consumed:${page}`;

// Avisa que os dados mudaram: cada página busca tudo de novo na próxima vez que abrir.
// usado em: helpers/usermenu
export const requestRefresh = (): void => {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, String(Date.now()));
  } catch {
    // localStorage indisponível (ex.: aba anônima): segue sem salvar
  }
};

// Pergunta (uma vez por página) se há um pedido de atualização pendente.
// usado em: helpers/pagebackend
export const consumeRefreshRequest = (page: string): boolean => {
  try {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!token || localStorage.getItem(consumedKey(page)) === token) return false;
    localStorage.setItem(consumedKey(page), token);
    return true;
  } catch {
    return false;
  }
};

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

const storageKey = (uid: string, key: string): string => `tickflix-cache-${uid}-${key}`;

// Lê o cache local de uma página do usuário (vale 7 dias).
// usado em: helpers/aisuggestion, helpers/pagebackend, presentation/problemcache
export const getPageCache = <T>(uid: string, key: string): T | null => {
  try {
    const raw = localStorage.getItem(storageKey(uid, key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
};

// Guarda o cache local de uma página do usuário.
// usado em: helpers/aisuggestion, helpers/pagebackend
export const setPageCache = <T>(uid: string, key: string, data: T): void => {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
    localStorage.setItem(storageKey(uid, key), JSON.stringify(entry));
  } catch {
    // localStorage indisponível (ex.: aba anônima): segue sem salvar
  }
};

// Apaga todo o cache local do usuário.
// usado em: helpers/usermenu
export const clearPageCache = (uid: string): void => {
  try {
    const prefix = `tickflix-cache-${uid}-`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage indisponível (ex.: aba anônima): segue sem salvar
  }
};
