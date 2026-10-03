// src/pages/private/series/functions.ts
// Chamadas ao TMDb da página Séries que continuam no browser: resolução
// completa de temporadas + episódios (usado só na hora de SEGUIR uma
// série, ver fetchSeriesWithEpisodes no fim do arquivo —
// service/FollowingSettings.ts grava o resultado direto, sem precisar
// rebuscar episódio depois) e utilitários de card. A DESCOBERTA (fileiras
// por streaming, "Top 20 do ano", trailers do topo) mora no backend —
// api/_lib/seriesData.ts, consumida por ./useDiscovery.ts — pra ser
// buscada uma vez e cacheada pra todos os usuários.
import { tmdbFetch } from "@/service/TMDbSettings";
import type { FollowedEpisode, FollowedSeason } from "@/service/FollowingSettings";

// Ids de provedor conferidos direto em /watch/providers/tv?watch_region=BR
// (TMDb não documenta isso em lugar fixo, muda por região) — "Max" hoje é
// o provider 1899 (rebranding da HBO Max), "Apple TV" (350) é o serviço de
// assinatura Apple TV+, não a loja avulsa da Apple. Espelhado em
// api/_lib/seriesData.ts (o backend usa a mesma lista).
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
  // Imagem de cena (paisagem) — opcional: cópias antigas em cache não têm.
  backdropPath?: string | null;
  voteAverage: number;
  originCountry: string; // ISO 3166-1 alpha-2, "" quando o TMDb não informa
}

// --- Lista de temporadas + status (resumo, primeiro passo pra seguir) -------
// Season 0 (especiais) fica de fora — não entra na contagem "oficial" de
// episódios da série pro usuário comum. `status` ("Returning Series",
// "Ended", "Canceled" etc.) vem do mesmo request — usado só pra decidir
// a legenda de episódio sem data agendada ainda (ver `episodeAiringInfo`,
// service/FollowingSettings.ts), não pra mais nada.
interface RawTvSeasonSummary {
  season_number: number;
  episode_count: number;
  name: string;
}

interface RawTvSummary {
  status: string;
  seasons: RawTvSeasonSummary[];
}

interface SeriesSeasonSummary {
  seasonNumber: number;
  episodeCount: number;
  name: string;
}

interface SeriesSeasonsResult {
  status: string;
  seasons: SeriesSeasonSummary[];
}

const fetchSeriesSeasons = async (seriesId: number): Promise<SeriesSeasonsResult> => {
  const data = await tmdbFetch<RawTvSummary>(`/tv/${seriesId}`);
  const seasons = data.seasons
    .filter((s) => s.season_number > 0)
    .map((s) => ({ seasonNumber: s.season_number, episodeCount: s.episode_count, name: s.name }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  return { status: data.status, seasons };
};

// --- Episódios de uma temporada ------------------------------------------------
interface RawEpisode {
  episode_number: number;
  name: string;
  air_date: string | null;
}

interface RawSeasonDetail {
  episodes: RawEpisode[];
}

const fetchSeasonEpisodeNames = async (seriesId: number, seasonNumber: number): Promise<RawEpisode[]> => {
  const data = await tmdbFetch<RawSeasonDetail>(`/tv/${seriesId}/season/${seasonNumber}`);
  return data.episodes;
};

// --- Temporadas + episódios completos (na hora de SEGUIR uma série) ---------
// Pedido explícito da Rebecca: "quando clicar para adicionar a série
// vamos colocar lá o nome da série, a quantidade de temporadas, os
// episódios e uma tag pra dizer se o episódio foi visto ou não" — ao
// contrário da primeira versão (que só guardava a CONTAGEM de episódios
// por temporada e resolvia o nome de cada um sob demanda, ao abrir a
// temporada no dialog), agora resolve TUDO de uma vez aqui: busca a
// lista de temporadas (fetchSeriesSeasons) e depois os episódios de CADA
// temporada em paralelo (Promise.all — mesmo padrão de
// home/dashboard/functions.ts pra lote de chamadas independentes), já
// que o doc gravado por service/FollowingSettings.ts precisa do
// episódio (nome + data de estreia + tag `watched`, começando false)
// pronto, não só a contagem. Retorna já no formato de mapa que o
// Firestore espera (`FollowedSeries.seasons`, chave = número como
// string) — permite marcar um episódio como visto depois com update
// atômico e direcionado, sem reescrever o array inteiro.
export interface SeriesWithEpisodes {
  status: string;
  seasons: Record<string, FollowedSeason>;
}

export const fetchSeriesWithEpisodes = async (seriesId: number): Promise<SeriesWithEpisodes> => {
  const { status, seasons } = await fetchSeriesSeasons(seriesId);
  const episodesPerSeason = await Promise.all(seasons.map((season) => fetchSeasonEpisodeNames(seriesId, season.seasonNumber)));

  const result: Record<string, FollowedSeason> = {};
  seasons.forEach((season, index) => {
    const episodes: Record<string, FollowedEpisode> = {};
    for (const ep of episodesPerSeason[index]) {
      episodes[String(ep.episode_number)] = { name: ep.name, watched: false, airDate: ep.air_date ?? "" };
    }
    result[String(season.seasonNumber)] = { name: season.name, episodes };
  });
  return { status, seasons: result };
};

// --- País de origem (badge do card) --------------------------------------------
// Converte um código ISO 3166-1 alpha-2 (ex.: "KR", "JP") num emoji de
// bandeira — cada letra vira o "regional indicator symbol" Unicode
// correspondente (offset fixo 127397 sobre o code point de A-Z), sem
// precisar de tabela/imagem própria. Usado no badge de cada card
// (SeriesRow.tsx e a busca em index.tsx) pra mostrar de onde a série é,
// junto da nota — pedido explícito da Rebecca.
export const countryFlagEmoji = (countryCode: string): string =>
  /^[A-Z]{2}$/.test(countryCode)
    ? String.fromCodePoint(...[...countryCode].map((char) => 127397 + char.charCodeAt(0)))
    : "";
