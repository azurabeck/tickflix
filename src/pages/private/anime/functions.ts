// src/pages/private/anime/functions.ts
// Chamadas ao TMDb específicas da página Animes — mesma lógica da página
// Séries (@/pages/private/series/functions.ts), pedido explícito da
// Rebecca: "vamos fazer uma página exatamente igual, mesma lógica e
// layout... para animes". Reusa dali o que é genérico o bastante pra não
// duplicar (tipo/constante/mecânica que não depende de incluir ou
// excluir anime): `STREAMING_PROVIDERS` (mesmos ids de provedor já
// conferidos), `SeriesRowItem` (mesmo formato de card), `countryFlagEmoji`
// (util pura) e `fetchSeriesWithEpisodes` (resolver temporada+episódio
// de um id do TMDb não tem nada de "série" ou "anime" — é só o mesmo
// endpoint `/tv/{id}`, funciona pra qualquer show).
//
// O que NÃO dá pra reusar direto (duplicado aqui, com a condição
// invertida): toda a descoberta por streaming/ano/trailer da página
// Séries EXCLUI anime (`isAnime`, lá); aqui é o oposto — só ENTRA quem é
// anime. Mesma definição de anime nos dois lugares: gênero Animação (id
// 16) + produzido no Japão (idioma original "ja" OU país de origem
// "JP") — mesma usada em home/dashboard/functions.ts (extractThemeFilters).
import { tmdbFetch } from "@/service/TMDbSettings";
import type { HeroTrailer } from "@/pages/private/home/dashboard/functions";
import type { SeriesRowItem } from "@/pages/private/series/functions";

const RATING_MIN_VOTES = 300;

interface RawTvResult {
  id: number;
  name: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  origin_country?: string[];
  original_language?: string;
  genre_ids?: number[];
}

const normalizeSeriesRowItem = (r: RawTvResult): SeriesRowItem => ({
  id: r.id,
  title: r.name,
  posterPath: r.poster_path,
  voteAverage: r.vote_average,
  originCountry: r.origin_country?.[0] ?? "",
});

const ANIME_GENRE_ID = 16;

const isAnime = (r: RawTvResult): boolean =>
  (r.genre_ids ?? []).includes(ANIME_GENRE_ID) && (r.original_language === "ja" || (r.origin_country ?? []).includes("JP"));

// Mesma ponderação bayesiana por volume de voto das fileiras de
// streaming da página Séries — ver o comentário completo em
// series/functions.ts (`weightedRating`). Nota MOSTRADA continua sendo a
// real; só a ORDEM usa a ponderação.
const WEIGHTED_RATING_M = 1000;

const weightedRating = (voteAverage: number, voteCount: number, poolMean: number): number =>
  (voteCount / (voteCount + WEIGHTED_RATING_M)) * voteAverage + (WEIGHTED_RATING_M / (voteCount + WEIGHTED_RATING_M)) * poolMean;

const CANDIDATE_PAGES = 5;

const fetchWeightedTopAnime = async (limit: number, extraParams: Record<string, string> = {}): Promise<SeriesRowItem[]> => {
  const candidates: RawTvResult[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= CANDIDATE_PAGES) {
    const data = await tmdbFetch<{ results: RawTvResult[]; total_pages: number }>("/discover/tv", {
      sort_by: "vote_count.desc",
      "vote_count.gte": String(RATING_MIN_VOTES),
      include_adult: "false",
      page: String(page),
      ...extraParams,
    });

    totalPages = data.total_pages;
    candidates.push(...data.results.filter(isAnime));
    page++;
  }

  if (candidates.length === 0) return [];

  const poolMean = candidates.reduce((sum, r) => sum + r.vote_average, 0) / candidates.length;

  return candidates
    .map((r) => ({ item: normalizeSeriesRowItem(r), weighted: weightedRating(r.vote_average, r.vote_count, poolMean) }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, limit)
    .map((entry) => entry.item);
};

// --- Fileiras "Melhor avaliados na {streaming}" ------------------------------
export const fetchTopAnimeByProvider = (providerId: number, limit: number): Promise<SeriesRowItem[]> =>
  fetchWeightedTopAnime(limit, {
    watch_region: "BR",
    with_watch_providers: String(providerId),
    with_watch_monetization_types: "flatrate",
  });

// --- "Top 20 mais vistos no ano" + carrossel de trailers ---------------------
// Mesmo critério da página Séries (ver o histórico completo do bug em
// series/functions.ts, `fetchTopSeriesOfTheYear`): `air_date.gte`/
// `air_date.lte` do ano atual inteiro (qualquer episódio de qualquer
// temporada, não só a primeira da série) + `sort_by=vote_count.desc`,
// sem ponderar nota.
export const fetchTopAnimeOfTheYear = async (limit: number): Promise<SeriesRowItem[]> => {
  const year = new Date().getFullYear();
  const collected: SeriesRowItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (collected.length < limit && page <= totalPages && page <= CANDIDATE_PAGES) {
    const data = await tmdbFetch<{ results: RawTvResult[]; total_pages: number }>("/discover/tv", {
      "air_date.gte": `${year}-01-01`,
      "air_date.lte": `${year}-12-31`,
      sort_by: "vote_count.desc",
      include_adult: "false",
      page: String(page),
    });

    totalPages = data.total_pages;
    collected.push(...data.results.filter(isAnime).map(normalizeSeriesRowItem));
    page++;
  }

  return collected.slice(0, limit);
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

const isLikelyDubbed = (name: string): boolean => /dublad[oa]/i.test(name);

export const fetchAnimeHeroTrailers = async (limit: number): Promise<HeroTrailer[]> => {
  const topAnime = await fetchTopAnimeOfTheYear(limit);

  const withTrailers = await Promise.all(
    topAnime.map(async (anime): Promise<HeroTrailer | null> => {
      try {
        const data = await tmdbFetch<{ results: RawTmdbVideo[] }>(`/tv/${anime.id}/videos`);
        const trailer = pickBestTrailer(data.results);
        return trailer ? { id: anime.id, title: anime.title, youtubeKey: trailer.key, isDubbed: isLikelyDubbed(trailer.name) } : null;
      } catch (err) {
        console.error(`Erro ao buscar trailer de ${anime.title}:`, err);
        return null;
      }
    })
  );

  return withTrailers.filter((item): item is HeroTrailer => item !== null);
};

// --- Busca (rodapé) -----------------------------------------------------------
// Igual searchSeries — NÃO filtra por anime (mesma decisão da página
// Séries pra busca: se a pessoa procurou o nome, mostra, mesmo que não
// bata com a classificação automática).
export const searchAnime = async (query: string, limit: number): Promise<SeriesRowItem[]> => {
  const data = await tmdbFetch<{ results: RawTvResult[] }>("/search/tv", { query });
  return data.results.slice(0, limit).map(normalizeSeriesRowItem);
};
