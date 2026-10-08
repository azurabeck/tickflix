import { useEffect, useRef, useState } from "react";
import { fetchBackend } from "@/service/BackendApi";
import { fetchCurrentCityName } from "@/service/LocationSettings";
import { consumeRefreshRequest, getPageCache, setPageCache } from "@/actions/helpers/pagecache";

// "São Paulo" -> "sao-paulo": o formato que o ingresso.com usa nas URLs.
// usado em: movies/nowplaying
export const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// A resposta do backend: uma entrada por section, com `items` ou `error`.
type BackendResponse = Record<string, { items?: unknown[]; error?: string }>;

// A resposta de uma section: os cards prontos, o carregando e o erro (só dela).
// usado em: as sections que pegam uma fatia do dashboard
export interface Section<T> {
  items: T[] | null;
  loading: boolean;
  error: string | null;
}

// O que o dashboard pede ao backend.
// usado em: usePageDashboard
export interface BackendOptions {
  endpoint: "dashboard" | "series";
  params: Record<string, string>; // identifica a página para o backend (ex.: page=movies ou kind=anime)
  // As sections da página em grupos: os grupos são pedidos juntos (em paralelo) e cada um chega e é guardado no cache por conta própria.
  // O que é rápido (Hero, Em cartaz...) fica separado do que é lento (Lançamentos, fileiras por streaming) para não esperar por ele.
  groups: string[][];
  city?: boolean; // a página muda com a cidade do usuário
}

const CITY_KEY = "tickflix-last-city";

const readCity = (): string | null => {
  try {
    return localStorage.getItem(CITY_KEY);
  } catch {
    return null;
  }
};

const saveCity = (city: string): void => {
  try {
    localStorage.setItem(CITY_KEY, city);
  } catch {
    // localStorage indisponível (ex.: aba anônima): segue sem salvar
  }
};

// Passo 3 do ciclo, a cidade: começa na última lembrada (ou Brasil) sem esperar; se o GPS trouxer outra, a página busca de novo
// (o servidor já tem cache por cidade).
const useCity = (enabled: boolean | undefined): string | null => {
  const [city, setCity] = useState<string | null>(() => (enabled ? readCity() : null));

  useEffect(() => {
    if (!enabled) return;
    fetchCurrentCityName()
      .catch(() => null)
      .then((gps) => {
        if (!gps) return;
        saveCity(gps);
        setCity(gps);
      });
  }, [enabled]);

  return city;
};

// Passo 1 do ciclo, o cache: o grupo só vale se veio inteiro (sem erro). Lista vazia é resposta válida (ex.: um streaming sem animes),
// menos no hero: sem trailers é uma falha, e guardar isso deixaria o topo vazio até o cache vencer.
const isComplete = (response: BackendResponse): boolean =>
  Object.entries(response).every(([name, part]) => part.items && (name !== "hero" || part.items.length > 0));

const readGroupCache = (uid: string | null, slot: string, index: number): BackendResponse | null => {
  const cached = uid ? getPageCache<BackendResponse>(uid, `${slot}:${index}`) : null;
  return cached && isComplete(cached) ? cached : null;
};

const saveGroupCache = (uid: string | null, slot: string, index: number, response: BackendResponse): void => {
  if (uid && isComplete(response)) setPageCache(uid, `${slot}:${index}`, response);
};

// Dashboard, parte backend. O ciclo de cada página:
//   1. confere o cache de cada grupo; 2. confere se pediram para atualizar; 3. confere a cidade; 4. pede ao backend o que faltou (um pedido por grupo).
// Devolve `section(nome)`: a fatia de uma section, com o loading do grupo dela.
// usado em: helpers/section
export const usePageBackend = (page: string, uid: string | null, lang: string, options: BackendOptions) => {
  const { groups, endpoint, params } = options;
  const [refresh] = useState(() => consumeRefreshRequest(page)); // pediram para buscar tudo de novo (vale na abertura da página)
  const city = useCity(options.city);
  const slot = `${page}:v4:${lang}:${city ?? "brasil"}`; // trocar idioma ou cidade muda o cache e refaz o pedido

  const [data, setData] = useState<BackendResponse>(() => Object.assign({}, ...groups.map((_, index) => readGroupCache(uid, slot, index) ?? {})));
  const [loadingGroups, setLoadingGroups] = useState<boolean[]>(() => groups.map((_, index) => readGroupCache(uid, slot, index) === null));
  const [failedGroups, setFailedGroups] = useState<boolean[]>(() => groups.map(() => false));
  const refreshUsed = useRef(false);

  const markGroup = (setter: (updater: (prev: boolean[]) => boolean[]) => void, index: number, value: boolean) =>
    setter((prev) => prev.map((current, i) => (i === index ? value : current)));

  // Passo 4: pede um grupo ao backend e guarda a resposta.
  const requestGroup = (index: number, forceRefresh: boolean, cancelled: () => boolean) => {
    const names = groups[index];
    markGroup(setLoadingGroups, index, true);
    markGroup(setFailedGroups, index, false);

    fetchBackend<BackendResponse>(endpoint, { ...params, only: names.join(","), lang, city: city ? slugify(city) : undefined, refresh: forceRefresh ? "1" : undefined })
      .then((response) => {
        if (cancelled()) return;
        setData((prev) => ({ ...prev, ...response }));
        saveGroupCache(uid, slot, index, response);
      })
      .catch((err) => {
        console.error(`Erro ao buscar "${names.join(", ")}" (backend):`, err);
        if (!cancelled()) markGroup(setFailedGroups, index, true);
      })
      .finally(() => {
        if (!cancelled()) markGroup(setLoadingGroups, index, false);
      });
  };

  useEffect(() => {
    const forceRefresh = refresh && !refreshUsed.current;
    refreshUsed.current = true;
    let cancelled = false;

    groups.forEach((_, index) => {
      const cached = readGroupCache(uid, slot, index);
      if (cached && !forceRefresh) {
        setData((prev) => ({ ...prev, ...cached }));
        markGroup(setLoadingGroups, index, false);
      } else {
        requestGroup(index, forceRefresh, () => cancelled);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  // A fatia de uma section: seus cards, o carregando (do grupo dela) e o erro dela.
  const section = <T,>(name: string, errorMessage = "Não foi possível carregar agora."): Section<T> => {
    const index = groups.findIndex((names) => names.includes(name));
    const part = data[name];
    return { items: (part?.items as T[] | undefined) ?? null, loading: loadingGroups[index] ?? false, error: part?.error || (failedGroups[index] && !part) ? errorMessage : null };
  };

  return { city, section };
};
