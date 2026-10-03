// src/service/PageCache.ts
// Cache de conteúdo "pesado" (TMDb/ingresso.com) em localStorage, por uid
// — pedido explícito da Rebecca: "tem muita coisa carregando nessa
// pagina vamos fazer um load geral pra cada página, e vamos usar o cache
// pra não ficar carregando toda vez que eu entro... o cache só fazer
// reload de 10 em 10 dias, ou se o usuário clicar para atualizar" (depois ajustado pra 7 dias, uma vez por semana).
//
// Guarda só dado que NÃO é ação do próprio usuário (filmes em cartaz,
// bilheteria, lançamentos, trailers do topo, fileiras de streaming...) —
// "Últimos vistos"/timelines seguidas/"já vi" continuam SEMPRE ao vivo
// (Firestore, muda a cada toggle/seguir — cachear isso esconderia a
// própria ação do usuário por até 7 dias, o oposto do que ela pediu).
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// "Atualizar" no UserMenu pede refresh de TODAS as páginas: grava um token
// (hora do clique) e cada página, ao montar, compara com o último token
// que ELA já consumiu — se for novo, pede `refresh=1` ao backend (que tem
// o próprio cache compartilhado, não limpo por `clearPageCache`, que é
// local) e marca como consumido. Por página (não um flag global) pra um
// refresh feito estando em Séries também valer depois na Home/Animes.
const REFRESH_TOKEN_KEY = "tickflix-refresh-token";
const consumedKey = (page: string): string => `tickflix-refresh-consumed:${page}`;

export const requestRefresh = (): void => {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, String(Date.now()));
  } catch {
    // localStorage indisponível — o reload ainda refaz o resto
  }
};

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

export const getPageCache = <T>(uid: string, key: string): T | null => {
  try {
    const raw = localStorage.getItem(storageKey(uid, key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null; // JSON inválido / localStorage indisponível — trata como "sem cache"
  }
};

export const setPageCache = <T>(uid: string, key: string, data: T): void => {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
    localStorage.setItem(storageKey(uid, key), JSON.stringify(entry));
  } catch {
    // quota cheia / indisponível (aba anônima etc.) — não é crítico, só não cacheia dessa vez
  }
};

// Botão "Atualizar" do menu da conta (@/components/userMenu) — limpa TODO
// cache desse usuário (qualquer página) antes de recarregar a aplicação,
// forçando buscar tudo de novo na hora.
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
    // ignore
  }
};
