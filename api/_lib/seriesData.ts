import { tmdbFetchServer } from "./tmdbServer.js";
import { isLikelyDubbed, pickBestTrailer, type HeroTrailer, type RawTmdbVideo } from "./dashboardData.js";

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
  mediaType: "tv";
  title: string;
  year: string;
  available?: boolean;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  originCountry: string;
}

interface RawTvResult {
  id: number;
  name: string;
  first_air_date?: string;
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
  mediaType: "tv",
  title: r.name,
  year: (r.first_air_date ?? "").slice(0, 4),
  posterPath: r.poster_path,
  backdropPath: r.backdrop_path ?? null,
  voteAverage: r.vote_average,
  originCountry: r.origin_country?.[0] ?? "",
});

const isAnime = (r: RawTvResult): boolean =>
  (r.genre_ids ?? []).includes(ANIME_GENRE_ID) && (r.original_language === "ja" || (r.origin_country ?? []).includes("JP"));

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
        const data = await tmdbFetchServer<{ results: RawTmdbVideo[] }>(`/tv/${item.id}/videos`, { include_video_language: "pt,en,null" }, lang);
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
