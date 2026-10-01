// src/components/movieDetail/functions.ts
// Busca todos os detalhes de um filme/série no TMDb (/movie/{id} ou
// /tv/{id}, com elenco via append_to_response=credits) — usado pelo modal
// que abre ao clicar num pôster em qualquer lugar do app (timeline,
// últimos vistos, em cartaz, bilheteria, busca do rodapé).
import { tmdbFetch } from "@/service/TMDbSettings";
import { movieKey } from "@/service/TimelineSettings";

export interface MovieDetail {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  // Nome original (idioma de produção) — pedido explícito da Rebecca:
  // "vamos colocar ali na descrição tb o nome original de cada filme".
  // `title` já vem traduzido (pt-BR, idioma padrão de `tmdbFetch`); quem
  // renderiza só mostra esse campo quando ele DIFERE de `title` (ver
  // index.tsx) — pra um filme nacional, por exemplo, os dois já são
  // iguais, mostrar de novo seria redundante.
  originalTitle: string;
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
  original_title: string;
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
  original_name: string;
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
      originalTitle: data.original_title,
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
    originalTitle: data.original_name,
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

// --- Disponibilidade (claquete) ----------------------------------------------
// Nasceu só na fileira "Principais lançamentos" (home/dashboard/functions.ts,
// `fetchRecentMajorReleases`) — generalizada pra cá, pedido explícito da
// Rebecca: "a claquete dizendo se o filme ta disponível em streaming ou
// aluguel, deve aparecer em todos os lugares do site, pode virar um
// padrão do componente global de details". Mora no MESMO arquivo que já
// resolve "onde assistir" pro modal de detalhes (não duplica a ideia de
// "disponível = tem flatrate ou rent"), usada por QUALQUER fileira/grade
// de pôster do app junto do componente global
// @/components/availabilityBadge.
export const isAvailableToWatch = (providers: WatchProviders | null): boolean =>
  Boolean(providers && (providers.flatrate.length > 0 || providers.rent.length > 0));

// Busca disponibilidade de VÁRIOS títulos de uma vez, em paralelo — mesmo
// padrão de `fetchWatchedMap` (service/WatchedSettings.ts): devolve um
// Map pela chave de `movieKey`, PRESENÇA = disponível (não guarda quem
// não está, só como `watchedMap` só guarda quem já foi visto). Falha em
// resolver UM título não derruba os outros (cada chamada é independente,
// `Promise.all` sobre promises que já tratam o próprio erro).
export const fetchAvailabilityMap = async (
  items: { id: number; mediaType: "movie" | "tv" }[],
  countryCode: string
): Promise<Map<string, true>> => {
  const keys = await Promise.all(
    items.map(async (item): Promise<string | null> => {
      try {
        const providers = await fetchWatchProviders(item.id, item.mediaType, countryCode);
        return isAvailableToWatch(providers) ? movieKey(item.mediaType, item.id) : null;
      } catch (err) {
        console.error(`Erro ao buscar disponibilidade de ${item.mediaType}-${item.id}:`, err);
        return null;
      }
    })
  );

  return new Map(keys.filter((key): key is string => key !== null).map((key) => [key, true as const]));
};
