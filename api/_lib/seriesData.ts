// api/_lib/seriesData.ts
// Descoberta das páginas Séries e Animes (antes em
// src/pages/private/series/functions.ts e anime/functions.ts, no
// browser). As duas páginas eram o MESMO código com a condição de anime
// invertida, então aqui é uma implementação só parametrizada por `kind`.
//
// Histórico das decisões (todas reportadas ao vivo pela Rebecca):
//
// - Ordem das fileiras por streaming: `popularity.desc` do TMDb é global
//   e pesado pra atividade recente (botava procedural com catálogo
//   enorme na frente de fenômeno real); nota crua (`vote_average`)
//   favorece nicho de fã-base pequena ("The Chosen", 966 votos, acima de
//   Arcane, 6138). Solução: candidatos ordenados por VOLUME de voto
//   (`vote_count.desc`, piso de 300 votos, até CANDIDATE_PAGES páginas) e
//   reordenados por média bayesiana ("Top Rated" clássico do IMDb):
//   (v/(v+m))×R + (m/(v+m))×C, m=1000, C=média do próprio pool. A nota
//   MOSTRADA no card continua a real; só a ORDEM usa a ponderação.
// - `with_watch_monetization_types=flatrate` (incluído na assinatura, não
//   avulso). Ids de provedor conferidos em /watch/providers/tv?watch_region=BR
//   ("Max" = 1899, "Apple TV+" = 350).
// - "Top 20 do ano" e trailers: `air_date.gte/lte` do ano inteiro (não
//   `first_air_date_year`, que excluía "A Casa do Dragão" mesmo com
//   temporada nova no ano) + `vote_count.desc`, sem ponderar nota. Efeito
//   aceito: `vote_count` é acumulado da série toda.
// - Anime = gênero Animação (16) + idioma original "ja" OU país "JP".
//   Séries EXCLUEM anime (só a combinação, animação ocidental fica);
//   a página Animes só INCLUI. O filtro é client-side do resultado porque
//   o /discover não tem como excluir só "animação japonesa".
//
// Duplicado de propósito do que sobrou em src/ (STREAMING_PROVIDERS,
// `SeriesRowItem`): `src/` é código de browser com alias `@/` que o
// bundler da Vercel não resolve.
import { tmdbFetchServer } from "./tmdbServer";
import { isLikelyDubbed, pickBestTrailer, type HeroTrailer, type RawTmdbVideo } from "./dashboardData";

export type DiscoveryKind = "series" | "anime";

export const STREAMING_PROVIDERS = [
  { id: 8, label: "Netflix" },
  { id: 119, label: "Prime Video" },
  { id: 337, label: "Disney+" },
  { id: 1899, label: "Max" },
  { id: 307, label: "Globoplay" },
  { id: 350, label: "Apple TV+" },
] as const;

export interface SeriesRowItem {
  id: number;
  title: string;
  posterPath: string | null;
  // Imagem de cena (paisagem) pros cards novos da página Séries.
  backdropPath: string | null;
  voteAverage: number;
  originCountry: string;
}

interface RawTvResult {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  vote_count: number;
  origin_country?: string[];
  original_language?: string;
  genre_ids?: number[];
}

const RATING_MIN_VOTES = 300;
const CANDIDATE_PAGES = 5;
const WEIGHTED_RATING_M = 1000;
const ANIME_GENRE_ID = 16;

const normalize = (r: RawTvResult): SeriesRowItem => ({
  id: r.id,
  title: r.name,
  posterPath: r.poster_path,
  backdropPath: r.backdrop_path ?? null,
  voteAverage: r.vote_average,
  originCountry: r.origin_country?.[0] ?? "",
});

const isAnime = (r: RawTvResult): boolean =>
  (r.genre_ids ?? []).includes(ANIME_GENRE_ID) && (r.original_language === "ja" || (r.origin_country ?? []).includes("JP"));

// Séries EXCLUEM anime; a página Animes só INCLUI.
const belongs = (kind: DiscoveryKind, r: RawTvResult): boolean => (kind === "anime" ? isAnime(r) : !isAnime(r));

const weightedRating = (voteAverage: number, voteCount: number, poolMean: number): number =>
  (voteCount / (voteCount + WEIGHTED_RATING_M)) * voteAverage + (WEIGHTED_RATING_M / (voteCount + WEIGHTED_RATING_M)) * poolMean;

export const fetchTopByProvider = async (kind: DiscoveryKind, providerId: number, limit: number, lang: string): Promise<SeriesRowItem[]> => {
  const candidates: RawTvResult[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= CANDIDATE_PAGES) {
    const data = await tmdbFetchServer<{ results: RawTvResult[]; total_pages: number }>(
      "/discover/tv",
      {
        sort_by: "vote_count.desc",
        "vote_count.gte": String(RATING_MIN_VOTES),
        include_adult: "false",
        page: String(page),
        watch_region: "BR",
        with_watch_providers: String(providerId),
        with_watch_monetization_types: "flatrate",
      },
      lang
    );
    totalPages = data.total_pages;
    candidates.push(...data.results.filter((r) => belongs(kind, r)));
    page++;
  }

  if (candidates.length === 0) return [];

  const poolMean = candidates.reduce((sum, r) => sum + r.vote_average, 0) / candidates.length;

  return candidates
    .map((r) => ({ item: normalize(r), weighted: weightedRating(r.vote_average, r.vote_count, poolMean) }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, limit)
    .map((entry) => entry.item);
};

export const fetchTopOfTheYear = async (kind: DiscoveryKind, limit: number, lang: string): Promise<SeriesRowItem[]> => {
  const year = new Date().getFullYear();
  const collected: SeriesRowItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (collected.length < limit && page <= totalPages && page <= CANDIDATE_PAGES) {
    const data = await tmdbFetchServer<{ results: RawTvResult[]; total_pages: number }>(
      "/discover/tv",
      {
        "air_date.gte": `${year}-01-01`,
        "air_date.lte": `${year}-12-31`,
        sort_by: "vote_count.desc",
        include_adult: "false",
        page: String(page),
      },
      lang
    );
    totalPages = data.total_pages;
    collected.push(...data.results.filter((r) => belongs(kind, r)).map(normalize));
    page++;
  }

  return collected.slice(0, limit);
};

export const fetchTvHeroTrailers = async (items: { id: number; title: string }[], lang: string): Promise<HeroTrailer[]> => {
  const withTrailers = await Promise.all(
    items.map(async (item): Promise<HeroTrailer | null> => {
      try {
        const data = await tmdbFetchServer<{ results: RawTmdbVideo[] }>(`/tv/${item.id}/videos`, {}, lang);
        const trailer = pickBestTrailer(data.results);
        return trailer ? { id: item.id, title: item.title, youtubeKey: trailer.key, isDubbed: isLikelyDubbed(trailer.name) } : null;
      } catch (err) {
        console.error(`Erro ao buscar trailer de ${item.title}:`, err);
        return null;
      }
    })
  );

  return withTrailers.filter((item): item is HeroTrailer => item !== null);
};
