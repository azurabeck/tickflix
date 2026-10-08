import i18n, { TMDB_LANGUAGE_BY_APP_LANGUAGE, type SupportedLanguage } from "./i18n";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

// usado no cabeçalho do detalhe do título (imagem de fundo grande).
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

const TMDB_BACKDROP_CARD_BASE = "https://image.tmdb.org/t/p/w780";
// usado no elenco do detalhe do título (foto dos atores).
export const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

// usado nos logos de streaming do detalhe do título.
export const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

// usado aqui nas chamadas ao TMDb e no prompt de pesquisa do "Adicionar dados" de Premiações.
export const READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_API_KEY;

const DEFAULT_TMDB_LANGUAGE = "pt-BR";

const currentTmdbLanguage = (): string => {
  const short = (i18n.language ?? "pt").slice(0, 2) as SupportedLanguage;
  return TMDB_LANGUAGE_BY_APP_LANGUAGE[short] ?? DEFAULT_TMDB_LANGUAGE;
};

const MAX_CONCURRENT_REQUESTS = 6;
const MIN_DISPATCH_GAP_MS = 120;

let activeRequests = 0;
const waitQueue: (() => void)[] = [];
let nextDispatchAt = 0;

const acquireSlot = (): Promise<void> => {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waitQueue.push(resolve));
};

const releaseSlot = (): void => {
  const next = waitQueue.shift();
  if (next) next();
  else activeRequests--;
};

const waitForDispatchGap = async (): Promise<void> => {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextDispatchAt);
  nextDispatchAt = scheduledAt + MIN_DISPATCH_GAP_MS;
  const delay = scheduledAt - now;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
};

const requestTmdb = (url: string): Promise<Response> =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${READ_ACCESS_TOKEN}`,
      accept: "application/json",
    },
  });

// Toda chamada ao TMDb passa por aqui (limita pedidos simultâneos, tenta de novo no 429 e já manda o idioma do app).
// usado no detalhe do título, nas temporadas das séries, nas estatísticas do Perfil e na criação de timeline pela IA.
export const tmdbFetch = async <T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> => {
  if (!READ_ACCESS_TOKEN) {
    throw new Error("VITE_TMDB_API_KEY não configurada — ver .env.example.");
  }

  const query = new URLSearchParams({ language: currentTmdbLanguage(), ...params });
  const url = `${TMDB_BASE_URL}${path}?${query.toString()}`;

  await acquireSlot();
  try {
    await waitForDispatchGap();
    let response = await requestTmdb(url);

    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      response = await requestTmdb(url);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = body?.status_message;
      throw new Error(`TMDb respondeu ${response.status} em ${path}${detail ? `: ${detail}` : ""}`);
    }

    return response.json() as Promise<T>;
  } finally {
    releaseSlot();
  }
};

// usado em todo card/lista que mostra pôster: cards de filmes e séries, timelines e modais de adicionar à timeline.
export const posterUrl = (path: string | null): string | null => (path ? `${TMDB_IMAGE_BASE}${path}` : null);

// usado no MediaCard (imagem de fundo dos cards).
export const backdropCardUrl = (path: string | null | undefined): string | null => (path ? `${TMDB_BACKDROP_CARD_BASE}${path}` : null);

export interface TmdbMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  poster_path: string | null;
}

interface RawTmdbResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
}

const normalizeResult = (item: RawTmdbResult, mediaType: "movie" | "tv"): TmdbMovie => ({
  id: item.id,
  mediaType,
  title: item.title ?? item.name ?? "Sem título",
  year: (item.release_date ?? item.first_air_date ?? "").slice(0, 4),
  poster_path: item.poster_path,
});

// Acha o título real no TMDb (pelo nome e ano) para validar o que a IA sugeriu.
// usado na section "Sugestão da IA" e na criação de timeline pela IA.
export const searchTmdbTitle = async (
  title: string,
  year: number,
  mediaType: "movie" | "tv"
): Promise<TmdbMovie | null> => {
  const yearParam = mediaType === "movie" ? "year" : "first_air_date_year";
  const data = await tmdbFetch<{ results: RawTmdbResult[] }>(`/search/${mediaType}`, {
    query: title,
    [yearParam]: String(year),
  });
  const best = data.results[0];
  return best ? normalizeResult(best, mediaType) : null;
};

interface RawTmdbMultiResult extends RawTmdbResult {
  media_type?: string;
}

// Busca filmes e séries/animes juntos pelo nome.
// usado na busca global (lupa da barra) e no modal "criar timeline" ao adicionar um título.
export const searchTitles = async (query: string, limit: number): Promise<TmdbMovie[]> => {
  const data = await tmdbFetch<{ results: RawTmdbMultiResult[] }>("/search/multi", { query });
  return data.results
    .filter((r): r is RawTmdbMultiResult & { media_type: "movie" | "tv" } => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, limit)
    .map((r) => normalizeResult(r, r.media_type));
};

interface ResolvedTitle {
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  voteAverage: number;
  category?: "series" | "animes"; // só para séries/animes (`tv`)
}

const titleMemo = new Map<string, Promise<ResolvedTitle | null>>();

// Título, pôster, fundo, ano e nota de um filme/série (guarda o resultado para não repetir a chamada).
// usado nos cards (imagem), nos ranks, nos últimos vistos, na lista "Minhas séries" e ao adicionar à timeline.
export const fetchTitleById = (mediaType: "movie" | "tv", id: number): Promise<ResolvedTitle | null> => {
  const memoKey = `${mediaType}-${id}`;
  const existing = titleMemo.get(memoKey);
  if (existing) return existing;

  const request = (async (): Promise<ResolvedTitle | null> => {
    try {
      const data = await tmdbFetch<{
        title?: string;
        name?: string;
        poster_path: string | null;
        backdrop_path: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        genres?: { id: number }[];
        original_language?: string;
        origin_country?: string[];
      }>(`/${mediaType}/${id}`);
      // Mesma definição de anime do resto do app: gênero Animação + produzido/falado em japonês.
      const isAnime = (data.genres ?? []).some((g) => g.id === 16) && (data.original_language === "ja" || (data.origin_country ?? []).includes("JP"));
      return {
        title: data.title ?? data.name ?? "Sem título",
        posterPath: data.poster_path,
        backdropPath: data.backdrop_path,
        year: (data.release_date ?? data.first_air_date ?? "").slice(0, 4),
        voteAverage: data.vote_average ?? 0,
        category: mediaType === "tv" ? (isAnime ? "animes" : "series") : undefined,
      };
    } catch (err) {
      console.error(`Erro ao resolver ${mediaType}/${id} no TMDb:`, err);
      titleMemo.delete(memoKey);
      return null;
    }
  })();

  titleMemo.set(memoKey, request);
  return request;
};

interface RawTmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  name: string;
}

const pickBestTrailer = (videos: RawTmdbVideo[]): RawTmdbVideo | null => {
  const youtube = videos.filter((v) => v.site === "YouTube");
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser") ??
    youtube[0] ??
    null
  );
};

const trailerMemo = new Map<string, Promise<string | null>>();

// usado no botão de trailer dos cards (MediaCardsProvider).
export const fetchTrailerKey = (mediaType: "movie" | "tv", id: number): Promise<string | null> => {
  const memoKey = `${mediaType}-${id}`;
  const existing = trailerMemo.get(memoKey);
  if (existing) return existing;

  const request = tmdbFetch<{ results: RawTmdbVideo[] }>(`/${mediaType}/${id}/videos`, { include_video_language: "pt,en,null" })
    .then((data) => pickBestTrailer(data.results)?.key ?? null)
    .catch((err) => {
      console.error(`Erro ao buscar trailer de ${mediaType}/${id}:`, err);
      trailerMemo.delete(memoKey);
      return null;
    });

  trailerMemo.set(memoKey, request);
  return request;
};
