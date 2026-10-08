import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/service/FirebaseSettings";
import { fetchBackend } from "@/service/BackendApi";
import { fetchCurrentCityName } from "@/service/LocationSettings";
import { TMDB_LANGUAGE_BY_APP_LANGUAGE, type SupportedLanguage } from "@/service/i18n";
import { useMediaCards } from "@/contexts/MediaCards";
import { consumeRefreshRequest, getPageCache, setPageCache } from "@/actions/helpers/pagecache";
import { fetchTimelines, type ContentType, type Timeline } from "@/actions/helpers/timelines";

// "São Paulo" -> "sao-paulo": o formato que o ingresso.com usa nas URLs.
// usado em: movies/nowplaying
export const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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

// A resposta de uma section: os cards prontos, o carregando e o erro (só dela).
export interface Section<T> {
  items: T[] | null;
  loading: boolean;
  error: string | null;
}

// A resposta do backend: uma entrada por section, com `items` ou `error`.
type BackendResponse = Record<string, { items?: unknown[]; error?: string }>;

interface DashboardOptions {
  endpoint: "dashboard" | "series";
  params: Record<string, string>; // identifica a página para o backend (ex.: page=movies ou kind=anime)
  // As sections da página em grupos: os grupos são pedidos juntos (em paralelo) e cada um chega e é guardado no cache por conta própria.
  // O que é rápido (Hero, Em cartaz...) fica separado do que é lento (Lançamentos, fileiras por streaming) para não esperar por ele.
  groups: string[][];
  city?: boolean; // a página muda com a cidade do usuário
  timelineType: ContentType; // tipo das "Timelines que você segue"
}

// Dashboard de uma página: duas funções universais que entregam a resposta por section.
//   Backend:  confere o cache da página -> confere se precisa atualizar -> confere a cidade -> pede ao backend o que falta (um pedido por grupo).
//   Firebase: lê o que é da página (timelines seguidas) e junta o que o MediaCardsProvider já lê (vistos e seguidos).
// As sections só pegam a sua fatia: dashboard.section("nome") e dashboard.firebase.
// usado em: animes/dashboard, movies/dashboard, series/dashboard
export const usePageDashboard = (page: string, options: DashboardOptions) => {
  const { i18n } = useTranslation();
  const { groups } = options;
  const uid = auth.currentUser?.uid ?? null;
  const lang = TMDB_LANGUAGE_BY_APP_LANGUAGE[(i18n.language ?? "pt").slice(0, 2) as SupportedLanguage] ?? "pt-BR";

  // --- Backend ---
  const [refresh] = useState(() => consumeRefreshRequest(page)); // pediram para buscar tudo de novo (vale na abertura da página)
  const [city, setCity] = useState<string | null>(() => (options.city ? readCity() : null));

  // Cidade: começa na última lembrada (ou Brasil) sem esperar; se o GPS trouxer outra, a página busca de novo (o servidor já tem cache por cidade).
  useEffect(() => {
    if (!options.city) return;
    fetchCurrentCityName()
      .catch(() => null)
      .then((gps) => {
        if (!gps) return;
        saveCity(gps);
        setCity(gps);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slot = `${page}:v4:${lang}:${city ?? "brasil"}`; // trocar idioma ou cidade muda o cache e refaz o pedido
  // O cache só vale se o grupo veio inteiro (sem erro). Lista vazia é resposta válida (ex.: um streaming sem animes), menos no hero:
  // sem trailers é uma falha, e guardar isso deixaria o topo vazio (sem nem o carregando) até o cache vencer.
  const usable = (response: BackendResponse) => Object.entries(response).every(([name, part]) => part.items && (name !== "hero" || part.items.length > 0));
  const cacheOf = (index: number) => {
    const cached = uid ? getPageCache<BackendResponse>(uid, `${slot}:${index}`) : null;
    return cached && usable(cached) ? cached : null;
  };

  const [data, setData] = useState<BackendResponse>(() => Object.assign({}, ...groups.map((_, index) => cacheOf(index) ?? {})));
  const [loadingGroups, setLoadingGroups] = useState<boolean[]>(() => groups.map((_, index) => cacheOf(index) === null));
  const [failedGroups, setFailedGroups] = useState<boolean[]>(() => groups.map(() => false));
  const refreshUsed = useRef(false);

  const markGroup = (setter: (updater: (prev: boolean[]) => boolean[]) => void, index: number, value: boolean) =>
    setter((prev) => prev.map((current, i) => (i === index ? value : current)));

  useEffect(() => {
    const forceRefresh = refresh && !refreshUsed.current;
    refreshUsed.current = true;
    let cancelled = false;

    groups.forEach((names, index) => {
      const cached = cacheOf(index);
      if (cached && !forceRefresh) {
        setData((prev) => ({ ...prev, ...cached }));
        markGroup(setLoadingGroups, index, false);
        return;
      }

      markGroup(setLoadingGroups, index, true);
      markGroup(setFailedGroups, index, false);
      fetchBackend<BackendResponse>(options.endpoint, {
        ...options.params,
        only: names.join(","),
        lang,
        city: city ? slugify(city) : undefined,
        refresh: forceRefresh ? "1" : undefined,
      })
        .then((response) => {
          if (cancelled) return;
          setData((prev) => ({ ...prev, ...response }));
          if (uid && usable(response)) setPageCache(uid, `${slot}:${index}`, response); // só guarda se o grupo veio inteiro
        })
        .catch((err) => {
          console.error(`Erro ao buscar "${names.join(", ")}" (backend):`, err);
          if (!cancelled) markGroup(setFailedGroups, index, true);
        })
        .finally(() => {
          if (!cancelled) markGroup(setLoadingGroups, index, false);
        });
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

  // --- Firebase ---
  const media = useMediaCards();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [timelinesLoading, setTimelinesLoading] = useState(uid !== null);

  useEffect(() => {
    if (!uid) return;
    fetchTimelines(uid)
      .then((all) => setTimelines(all.filter((t) => t.followed && t.types.includes(options.timelineType))))
      .catch((err) => console.error("Erro ao buscar timelines seguidas:", err))
      .finally(() => setTimelinesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const firebase = {
    followedTimelines: { items: timelines, loading: timelinesLoading }, // section "Timelines que você segue"
    watchedLoading: media.watchedLoading, // sections "Últimos vistos" e "Seu Rank de Notas"
    followedLoading: media.followedLoading, // section "Minhas séries"
  };

  return { uid, lang, city, section, firebase };
};

export type PageDashboard = ReturnType<typeof usePageDashboard>;
