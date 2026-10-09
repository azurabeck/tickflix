import { tmdbFetchServer } from "./tmdbServer.js";

const INGRESSO_BASE_URL = "https://www.ingresso.com";
const READER_PROXY_URL = "https://r.jina.ai/";

export const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const buildIngressoMovieUrl = (title: string): string => `${INGRESSO_BASE_URL}/filme/${slugify(title)}`;

export interface DashboardMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  year: string;
  available?: boolean;
}

export interface MovieRowItem {
  id?: number;
  mediaType?: "movie" | "tv";
  title: string;
  year?: string;
  available?: boolean;
  posterPath?: string | null;
  backdropPath?: string | null;
  posterUrl?: string;
  href?: string;
  rankLabel?: string;
}

export interface HeroTrailer {
  id: number;
  title: string;
  youtubeKey: string;
  isDubbed: boolean;
}

export interface MajorReleaseMovie extends DashboardMovie {
  available: boolean;
  releaseDate: string;
}

interface IngressoNowPlayingMovie {
  title: string;
  posterUrl: string;
  movieUrl: string;
}

const MOVIE_BLOCK_PATTERN =
  /!\[Image \d+: ([^\]]+)\]\((https:\/\/ingresso-a\.akamaihd\.net\/prd\/img\/movie\/[^)]+)\)[^\]]*\]\(https:\/\/www\.ingresso\.com\/filme\/([a-z0-9-]+)\?city=/g;

const fetchIngressoNowPlaying = async (citySlug: string, limit: number): Promise<IngressoNowPlayingMovie[]> => {
  const targetUrl = `${INGRESSO_BASE_URL}/filmes/em-cartaz?city=${citySlug}`;
  const response = await fetch(`${READER_PROXY_URL}${targetUrl}`);
  if (!response.ok) {
    throw new Error(`Leitor de página do ingresso.com respondeu ${response.status}`);
  }

  const markdown = await response.text();
  const movies: IngressoNowPlayingMovie[] = [];
  const seenSlugs = new Set<string>();

  for (const match of markdown.matchAll(MOVIE_BLOCK_PATTERN)) {
    const [, title, posterUrl, slug] = match;
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    movies.push({ title, posterUrl, movieUrl: `${INGRESSO_BASE_URL}/filme/${slug}` });
    if (movies.length >= limit) break;
  }

  if (movies.length === 0) {
    throw new Error("Não encontrei nenhum filme em cartaz na página do ingresso.com — formato da página pode ter mudado.");
  }

  return movies;
};

interface RawTmdbResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
}

interface TmdbMovie {
  id: number;
  mediaType: "movie" | "tv";
  year: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

const searchMovieByTitle = async (title: string, lang: string): Promise<TmdbMovie | null> => {
  const data = await tmdbFetchServer<{ results: RawTmdbResult[] }>("/search/movie", { query: title }, lang);
  const best = data.results[0];
  return best ? { id: best.id, mediaType: "movie", year: (best.release_date ?? "").slice(0, 4), poster_path: best.poster_path, backdrop_path: best.backdrop_path ?? null } : null;
};

const stripTrailingParenthetical = (title: string): string => title.replace(/\s*\([^)]*\)\s*$/, "").trim();

export const fetchIngressoNowPlayingResolved = async (citySlug: string, limit: number, lang: string): Promise<MovieRowItem[]> => {
  const listed = await fetchIngressoNowPlaying(citySlug, limit);

  return Promise.all(
    listed.map(async (movie): Promise<MovieRowItem> => {
      const strippedTitle = stripTrailingParenthetical(movie.title);
      let match: TmdbMovie | null = null;
      try {
        match = await searchMovieByTitle(strippedTitle, lang);
        if (!match && strippedTitle !== movie.title) {
          match = await searchMovieByTitle(movie.title, lang);
        }
      } catch (err) {
        console.error(`Erro ao resolver "${movie.title}" no TMDb:`, err);
      }

      return match
        ? {
            id: match.id,
            mediaType: match.mediaType,
            title: movie.title,
            year: match.year,
            posterPath: match.poster_path,
            backdropPath: match.backdrop_path,
            href: movie.movieUrl,
            rankLabel: "Comprar ingresso",
          }
        : { title: movie.title, posterUrl: movie.posterUrl, href: movie.movieUrl, rankLabel: "Comprar ingresso" };
    })
  );
};

interface RawTmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
}

const toDashboardMovie = (m: RawTmdbMovie): DashboardMovie => ({
  id: m.id,
  mediaType: "movie",
  title: m.title,
  posterPath: m.poster_path,
  backdropPath: m.backdrop_path,
  voteAverage: m.vote_average,
  year: (m.release_date ?? "").slice(0, 4),
});

export const fetchNowPlayingBrazil = async (limit: number, lang: string): Promise<DashboardMovie[]> => {
  const data = await tmdbFetchServer<{ results: RawTmdbMovie[] }>("/movie/now_playing", { region: "BR" }, lang);
  return data.results.slice(0, limit).map(toDashboardMovie);
};

export const fetchBoxOfficeChampions = async (limit: number, lang: string): Promise<DashboardMovie[]> => {
  const year = new Date().getFullYear();
  const data = await tmdbFetchServer<{ results: RawTmdbMovie[] }>(
    "/discover/movie",
    {
      sort_by: "revenue.desc",
      primary_release_year: String(year),
      include_adult: "false",
      "vote_count.gte": "300",
    },
    lang
  );
  return data.results.slice(0, limit).map(toDashboardMovie);
};

const releasesCandidatePages = (limit: number): number => Math.max(5, Math.ceil(limit / 15));

interface RawTmdbMovieWithGenres extends RawTmdbMovie {
  genre_ids: number[];
  original_language: string;
  release_date: string;
}

const ANIMATION_GENRE_ID = 16;
const isWesternMovie = (m: RawTmdbMovieWithGenres): boolean => !(m.genre_ids.includes(ANIMATION_GENRE_ID) && m.original_language === "ja");

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

interface RawReleaseDateEntry {
  release_date: string;
  type: number;
}

interface RawCountryReleaseDates {
  iso_3166_1: string;
  release_dates: RawReleaseDateEntry[];
}

const THEATRICAL_RELEASE_TYPES = new Set([2, 3]);

const earliestReleaseDate = (entries: RawReleaseDateEntry[]): string =>
  entries.reduce((earliest, entry) => (entry.release_date < earliest ? entry.release_date : earliest), entries[0].release_date).slice(0, 10);

const extractTheatricalDate = (country: RawCountryReleaseDates | undefined): string | null => {
  if (!country || country.release_dates.length === 0) return null;
  const theatrical = country.release_dates.filter((d) => THEATRICAL_RELEASE_TYPES.has(d.type));
  return earliestReleaseDate(theatrical.length > 0 ? theatrical : country.release_dates);
};

const fetchBrOrUsReleaseDate = async (movieId: number, lang: string): Promise<string | null> => {
  const data = await tmdbFetchServer<{ results: RawCountryReleaseDates[] }>(`/movie/${movieId}/release_dates`, {}, lang);
  const br = extractTheatricalDate(data.results.find((r) => r.iso_3166_1 === "BR"));
  const us = extractTheatricalDate(data.results.find((r) => r.iso_3166_1 === "US"));
  if (br && us) return br < us ? br : us;
  return br ?? us;
};

interface RawWatchProvider {
  provider_id: number;
}
interface RawCountryProviders {
  flatrate?: RawWatchProvider[];
  rent?: RawWatchProvider[];
}
interface RawWatchProvidersResponse {
  results: Record<string, RawCountryProviders>;
}

const isAvailableToWatch = (country: RawCountryProviders | undefined): boolean =>
  Boolean(country && ((country.flatrate?.length ?? 0) > 0 || (country.rent?.length ?? 0) > 0));

const fetchAvailableBrUs = async (id: number, lang: string, mediaType: "movie" | "tv" = "movie"): Promise<boolean> => {
  const data = await tmdbFetchServer<RawWatchProvidersResponse>(`/${mediaType}/${id}/watch/providers`, {}, lang);
  return isAvailableToWatch(data.results.BR) || isAvailableToWatch(data.results.US);
};

export const fetchRecentMajorReleases = async (limit: number, lang: string): Promise<MajorReleaseMovie[]> => {
  const today = new Date();
  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const collected: RawTmdbMovieWithGenres[] = [];
  const seenIds = new Set<number>();
  let page = 1;
  let totalPages = 1;
  const candidatePages = releasesCandidatePages(limit);

  while (collected.length < limit && page <= totalPages && page <= candidatePages) {
    const data = await tmdbFetchServer<{ results: RawTmdbMovieWithGenres[]; total_pages: number }>(
      "/discover/movie",
      {
        sort_by: "popularity.desc",
        "primary_release_date.gte": isoDate(twelveMonthsAgo),
        "primary_release_date.lte": isoDate(today),
        region: "BR",
        include_adult: "false",
        "vote_count.gte": "10",
        page: String(page),
      },
      lang
    );
    totalPages = data.total_pages;
    for (const movie of data.results.filter(isWesternMovie)) {
      if (seenIds.has(movie.id)) continue;
      seenIds.add(movie.id);
      collected.push(movie);
    }
    page += 1;
  }

  const movies = collected.slice(0, limit);

  const withAvailability = await Promise.all(
    movies.map(async (m): Promise<MajorReleaseMovie> => {
      const [availableResult, releaseDateResult] = await Promise.allSettled([
        fetchAvailableBrUs(m.id, lang),
        fetchBrOrUsReleaseDate(m.id, lang),
      ]);

      if (availableResult.status === "rejected") console.error(`Erro ao buscar onde assistir de ${m.title}:`, availableResult.reason);

      const available = availableResult.status === "fulfilled" && availableResult.value;

      let releaseDate = m.release_date;
      if (releaseDateResult.status === "fulfilled" && releaseDateResult.value) {
        releaseDate = releaseDateResult.value;
      } else if (releaseDateResult.status === "rejected") {
        console.error(`Erro ao buscar data de lançamento (Brasil/EUA) de ${m.title}:`, releaseDateResult.reason);
      }

      return { ...toDashboardMovie(m), available, releaseDate };
    })
  );

  const todayIso = isoDate(today);
  return withAvailability.filter((m) => m.releaseDate <= todayIso);
};

export interface RawTmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  name: string;
}

export const pickBestTrailer = (videos: RawTmdbVideo[]): RawTmdbVideo | null => {
  const youtube = videos.filter((v) => v.site === "YouTube");
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser") ??
    youtube[0] ??
    null
  );
};

export const isLikelyDubbed = (name: string): boolean => /dublad[oa]/i.test(name);

export const fetchHeroTrailers = async (movies: { id: number; title: string }[], lang: string): Promise<HeroTrailer[]> => {
  const withTrailers = await Promise.all(
    movies.map(async (movie): Promise<HeroTrailer | null> => {
      try {
        const data = await tmdbFetchServer<{ results: RawTmdbVideo[] }>(`/movie/${movie.id}/videos`, { include_video_language: "pt,en,null" }, lang);
        const trailer = pickBestTrailer(data.results);
        return trailer ? { id: movie.id, title: movie.title, youtubeKey: trailer.key, isDubbed: isLikelyDubbed(trailer.name) } : null;
      } catch (err) {
        console.error(`Erro ao buscar trailer de ${movie.title}:`, err);
        return null;
      }
    })
  );

  return withTrailers.filter((item): item is HeroTrailer => item !== null);
};

// Marca cada card com "dá para assistir" (assinatura ou aluguel no Brasil ou EUA), para o front não precisar consultar de novo.
export const withAvailability = async <T extends { id?: number; mediaType?: "movie" | "tv" }>(items: T[], lang: string): Promise<(T & { available: boolean })[]> =>
  Promise.all(
    items.map(async (item) => ({
      ...item,
      available: item.id === undefined ? false : await fetchAvailableBrUs(item.id, lang, item.mediaType ?? "movie").catch(() => false),
    }))
  );
