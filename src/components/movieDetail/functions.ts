// src/components/movieDetail/functions.ts
// Busca todos os detalhes de um filme/série no TMDb (/movie/{id} ou
// /tv/{id}, com elenco via append_to_response=credits) — usado pelo modal
// que abre ao clicar num pôster em qualquer lugar do app (timeline,
// últimos vistos, em cartaz, bilheteria, busca do rodapé).
import { tmdbFetch } from "@/service/TMDbSettings";

export interface MovieDetail {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  tagline: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string; // "" se desconhecida
  runtimeMinutes: number | null; // só filme
  seasons: number | null; // só série
  episodes: number | null; // só série
  genres: string[];
  voteAverage: number;
  voteCount: number;
  status: string;
  directors: string[]; // filme: crew "Director"; série: created_by
  cast: MovieDetailCastMember[];
}

export interface MovieDetailCastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

interface RawGenre {
  id: number;
  name: string;
}

interface RawCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface RawCrewMember {
  id: number;
  name: string;
  job: string;
}

interface RawCredits {
  cast: RawCastMember[];
  crew: RawCrewMember[];
}

interface RawMovieDetail {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: RawGenre[];
  vote_average: number;
  vote_count: number;
  status: string;
  credits: RawCredits;
}

interface RawTvDetail {
  id: number;
  name: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: RawGenre[];
  vote_average: number;
  vote_count: number;
  status: string;
  created_by: { id: number; name: string }[];
  credits: RawCredits;
}

const CAST_LIMIT = 10;

const mapCast = (cast: RawCastMember[]): MovieDetailCastMember[] =>
  cast.slice(0, CAST_LIMIT).map((c) => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profile_path }));

export const fetchMovieDetail = async (id: number, mediaType: "movie" | "tv"): Promise<MovieDetail> => {
  if (mediaType === "movie") {
    const data = await tmdbFetch<RawMovieDetail>(`/movie/${id}`, { append_to_response: "credits" });
    return {
      id: data.id,
      mediaType: "movie",
      title: data.title,
      tagline: data.tagline,
      overview: data.overview,
      posterPath: data.poster_path,
      backdropPath: data.backdrop_path,
      releaseDate: data.release_date ?? "",
      runtimeMinutes: data.runtime || null,
      seasons: null,
      episodes: null,
      genres: data.genres.map((g) => g.name),
      voteAverage: data.vote_average,
      voteCount: data.vote_count,
      status: data.status,
      directors: data.credits.crew.filter((c) => c.job === "Director").map((c) => c.name),
      cast: mapCast(data.credits.cast),
    };
  }

  const data = await tmdbFetch<RawTvDetail>(`/tv/${id}`, { append_to_response: "credits" });
  return {
    id: data.id,
    mediaType: "tv",
    title: data.name,
    tagline: data.tagline,
    overview: data.overview,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    releaseDate: data.first_air_date ?? "",
    runtimeMinutes: null,
    seasons: data.number_of_seasons,
    episodes: data.number_of_episodes,
    genres: data.genres.map((g) => g.name),
    voteAverage: data.vote_average,
    voteCount: data.vote_count,
    status: data.status,
    directors: data.created_by.map((c) => c.name),
    cast: mapCast(data.credits.cast),
  };
};

export const formatRuntime = (minutes: number | null): string | null => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h${String(mins).padStart(2, "0")}min` : `${mins}min`;
};

// --- Onde assistir (/watch/providers) ----------------------------------------
// Pedido explícito da Rebecca: no detalhe de um filme, mostrar onde ele
// está disponível pra assistir no local atual do usuário. O TMDb
// organiza isso por país (ISO 3166-1 alpha-2, ex.: "BR") — não tem
// versão "cidade" nem "endereço específico". `countryCode` vem de
// service/LocationSettings.ts (fetchCurrentLocation), resolvido por
// geolocation + reverse geocoding; sem permissão de localização, quem
// chama usa "BR" como fallback (mesma escolha já feita em "Em cartaz").
//
// Dado vem de terceiro (JustWatch, via TMDb) — os termos de uso do TMDb
// pra esse endpoint pedem atribuição visível "Fornecido por JustWatch"
// com link de volta (`link` abaixo), não é opcional exibir sem isso.
export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchProviders {
  countryCode: string;
  link: string | null; // página do JustWatch pra esse título+país — a atribuição exige linkar de volta
  flatrate: WatchProvider[]; // por assinatura (Netflix, Prime Video etc.)
  rent: WatchProvider[];
  buy: WatchProvider[];
}

interface RawWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface RawCountryProviders {
  link?: string;
  flatrate?: RawWatchProvider[];
  rent?: RawWatchProvider[];
  buy?: RawWatchProvider[];
}

interface RawWatchProvidersResponse {
  results: Record<string, RawCountryProviders>;
}

const mapProviders = (list?: RawWatchProvider[]): WatchProvider[] =>
  (list ?? []).map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));

// `null` = sem dado nenhum pra esse país (título pode até estar
// disponível em algum serviço, o TMDb/JustWatch só não tem esse país
// catalogado pra ele) — diferente de erro de rede, que joga (deixa o
// .catch de quem chama decidir).
export const fetchWatchProviders = async (
  id: number,
  mediaType: "movie" | "tv",
  countryCode: string
): Promise<WatchProviders | null> => {
  const data = await tmdbFetch<RawWatchProvidersResponse>(`/${mediaType}/${id}/watch/providers`);
  const country = data.results[countryCode];
  if (!country) return null;

  return {
    countryCode,
    link: country.link ?? null,
    flatrate: mapProviders(country.flatrate),
    rent: mapProviders(country.rent),
    buy: mapProviders(country.buy),
  };
};
