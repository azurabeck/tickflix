import { useEffect, useState } from "react";
import { fetchCurrentLocation } from "@/service/LocationSettings";
import { tmdbFetch } from "@/service/TMDbSettings";
import { movieKey } from "@/actions/helpers/timelines";

export interface MovieDetail {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string;
  tagline: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  runtimeMinutes: number | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  voteAverage: number;
  voteCount: number;
  status: string;
  directors: string[];
  cast: { id: number; name: string; character: string; profilePath: string | null }[];
  trailerKey: string | null;
}

export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchProviders {
  countryCode: string;
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

// ---------- 1. Detalhe do título (TMDb) ----------

// Filme e série vêm com campos de nome diferentes (title/name, release_date/first_air_date...); este tipo cobre os dois.
interface RawDetail {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres: { name: string }[];
  vote_average: number;
  vote_count: number;
  status: string;
  created_by?: { name: string }[];
  credits: { cast: { id: number; name: string; character: string; profile_path: string | null }[]; crew: { name: string; job: string }[] };
  videos: { results: { key: string; site: string; type: string; official: boolean }[] };
}

const CAST_LIMIT = 10;

// O melhor vídeo do YouTube: trailer oficial, depois qualquer trailer, depois teaser.
const pickTrailerKey = (videos: RawDetail["videos"]["results"]): string | null => {
  const youtube = videos.filter((v) => v.site === "YouTube");
  return (youtube.find((v) => v.type === "Trailer" && v.official) ?? youtube.find((v) => v.type === "Trailer") ?? youtube.find((v) => v.type === "Teaser") ?? youtube[0])?.key ?? null;
};

const fetchMovieDetail = async (id: number, mediaType: "movie" | "tv"): Promise<MovieDetail> => {
  const data = await tmdbFetch<RawDetail>(`/${mediaType}/${id}`, { append_to_response: "credits,videos" });
  const isMovie = mediaType === "movie";
  return {
    id: data.id,
    mediaType,
    title: (isMovie ? data.title : data.name) ?? "",
    originalTitle: (isMovie ? data.original_title : data.original_name) ?? "",
    tagline: data.tagline,
    overview: data.overview,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    releaseDate: (isMovie ? data.release_date : data.first_air_date) ?? "",
    runtimeMinutes: isMovie ? data.runtime || null : null,
    seasons: isMovie ? null : data.number_of_seasons ?? null,
    episodes: isMovie ? null : data.number_of_episodes ?? null,
    genres: data.genres.map((g) => g.name),
    voteAverage: data.vote_average,
    voteCount: data.vote_count,
    status: data.status,
    directors: isMovie ? data.credits.crew.filter((c) => c.job === "Director").map((c) => c.name) : (data.created_by ?? []).map((c) => c.name),
    cast: data.credits.cast.slice(0, CAST_LIMIT).map((c) => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profile_path })),
    trailerKey: pickTrailerKey(data.videos.results),
  };
};

// "2h28min". usado no cabeçalho do detalhe do título.
export const formatRuntime = (minutes: number | null): string | null => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h${String(mins).padStart(2, "0")}min` : `${mins}min`;
};

// ---------- 2. Onde assistir (TMDb) ----------

interface RawProviders {
  link?: string;
  flatrate?: { provider_id: number; provider_name: string; logo_path: string | null }[];
  rent?: { provider_id: number; provider_name: string; logo_path: string | null }[];
  buy?: { provider_id: number; provider_name: string; logo_path: string | null }[];
}

const toProviders = (country: RawProviders | undefined, countryCode: string): WatchProviders | null => {
  if (!country) return null;
  const map = (list: RawProviders["flatrate"]): WatchProvider[] => (list ?? []).map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
  return { countryCode, link: country.link ?? null, flatrate: map(country.flatrate), rent: map(country.rent), buy: map(country.buy) };
};

const fetchProviders = async (id: number, mediaType: "movie" | "tv"): Promise<Record<string, RawProviders>> =>
  (await tmdbFetch<{ results: Record<string, RawProviders> }>(`/${mediaType}/${id}/watch/providers`)).results;

// Disponível = dá para assistir (assinatura ou aluguel) no Brasil ou nos EUA. Tenta de novo uma vez se a chamada falhar.
// usado no selo "disponível" dos cards de qualquer página (MediaCardsProvider).
export const fetchAvailabilityMap = async (items: { id: number; mediaType: "movie" | "tv" }[]): Promise<Map<string, true>> => {
  const canWatch = (country: RawProviders | undefined) => Boolean(country && ((country.flatrate?.length ?? 0) > 0 || (country.rent?.length ?? 0) > 0));

  const keys = await Promise.all(
    items.map(async ({ id, mediaType }): Promise<string | null> => {
      try {
        const results = await fetchProviders(id, mediaType).catch(() => fetchProviders(id, mediaType));
        return canWatch(results.BR) || canWatch(results.US) ? movieKey(mediaType, id) : null;
      } catch (err) {
        console.error(`Erro ao buscar disponibilidade de ${mediaType}-${id}:`, err);
        return null;
      }
    })
  );
  return new Map(keys.filter((key): key is string => key !== null).map((key) => [key, true as const]));
};

// ---------- 3. Ciclo do modal ----------

// Ciclo "abrir o detalhe de um título": busca o detalhe e, em paralelo, onde assistir (no país do usuário; sem localização, Brasil).
// usado no modal de detalhe do filme/série (aberto pelos cards de qualquer página).
export const useMovieDetail = (id: number, mediaType: "movie" | "tv") => {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<WatchProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    setProviders(null);
    setProvidersLoading(true);

    fetchMovieDetail(id, mediaType)
      .then((data) => !cancelled && setDetail(data))
      .catch((err) => {
        console.error("Erro ao buscar detalhes do título:", err);
        if (!cancelled) setError("Não foi possível carregar os detalhes agora.");
      });

    fetchCurrentLocation()
      .then(async ({ countryCode }) => {
        const code = countryCode ?? "BR";
        return toProviders((await fetchProviders(id, mediaType))[code], code);
      })
      .then((data) => !cancelled && setProviders(data))
      .catch((err) => console.error("Erro ao buscar onde assistir:", err))
      .finally(() => !cancelled && setProvidersLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, mediaType]);

  return { detail, error, providers, providersLoading };
};
