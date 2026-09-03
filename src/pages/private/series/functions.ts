// src/pages/private/series/functions.ts
// Chamadas ao TMDb específicas da página Séries — descoberta por
// streaming, trailer das mais bem avaliadas do momento (topo da página,
// ver fetchSeriesHeroTrailers), busca de série solta e resolução
// completa de temporadas + episódios (usado só na hora de SEGUIR uma
// série, ver fetchSeriesWithEpisodes no fim do arquivo —
// service/FollowingSettings.ts grava o resultado direto, sem precisar
// rebuscar episódio depois).
import { tmdbFetch } from "@/service/TMDbSettings";
import type { HeroTrailer } from "@/pages/private/home/dashboard/functions";
import type { FollowedEpisode, FollowedSeason } from "@/service/FollowingSettings";

// --- Fileiras "Melhor avaliadas na {streaming}" ------------------------------
// TMDb não expõe audiência/visualizações real nenhuma (mesma limitação já
// documentada em "Campeões de bilheteria" da Home, home/dashboard/functions.ts).
// Passou por duas correções, as duas reportadas ao vivo pela Rebecca:
//
// 1) Primeira versão usava `sort_by=popularity.desc` — "popularity" do
//    TMDb é global (não é BR) e pesado pra atividade RECENTE no site
//    deles, botava procedural com catálogo enorme (ex.: "O Mentalista")
//    na frente de fenômeno real (ex.: Stranger Things). Trocado por nota
//    (`vote_average`).
// 2) Nota CRUA sozinha (`sort_by=vote_average.desc`) tem o problema
//    oposto: favorece nicho de fã-base pequena e devotada (poucos votos,
//    quase todo mundo que vota é fã) sobre sucesso de massa (voto de todo
//    mundo, inclusive quem gostou menos) — "The Chosen" (966 votos)
//    rankeava acima de Arcane (6138 votos). Corrigido com uma média
//    ponderada por volume de voto (`weightedRating` abaixo, estilo "Top
//    Rated" clássico do IMDb) — a nota MOSTRADA no card continua sendo a
//    real, só a ORDEM da fileira usa a ponderação.
//
// `vote_count.gte=RATING_MIN_VOTES` continua necessário — sem piso de
// voto, título obscuro com poucos votos e nota alta por acaso ainda
// polui o pool de candidatos (mesmo problema já documentado em
// fetchBoxOfficeChampions da Home); 300 é o mesmo piso usado lá.
// `with_watch_monetization_types=flatrate` restringe a título incluído na
// assinatura (não avulso pra alugar/comprar), que é o sentido de "estar
// naquele streaming" pro usuário comum.
//
// Ids de provedor conferidos direto em /watch/providers/tv?watch_region=BR
// (TMDb não documenta isso em lugar fixo, muda por região) — "Max" hoje é
// o provider 1899 (rebranding da HBO Max), "Apple TV" (350) é o serviço de
// assinatura Apple TV+, não a loja avulsa da Apple.
export const STREAMING_PROVIDERS = [
  { id: 8, label: "Netflix" },
  { id: 119, label: "Prime Video" },
  { id: 337, label: "Disney+" },
  { id: 1899, label: "Max" },
  { id: 307, label: "Globoplay" },
  { id: 350, label: "Apple TV+" },
] as const;

const RATING_MIN_VOTES = 300;

export interface SeriesRowItem {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  originCountry: string; // ISO 3166-1 alpha-2, "" quando o TMDb não informa
}

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

// Anime fica de fora dessas fileiras — pedido explícito da Rebecca:
// "vamos excluir os animes, depois vamos fazer uma categoria só pra
// eles" (ainda não implementada). Anime = gênero Animação (id 16 no
// TMDb) + produzido no Japão (idioma original "ja" OU país de origem
// "JP") — mesma definição já usada em home/dashboard/functions.ts
// (extractThemeFilters) pra distinguir anime de animação em geral.
// IMPORTANTE: animação ocidental (Rick e Morty, Arcane, Avatar etc.)
// continua nas fileiras normalmente — só a combinação gênero+Japão é
// excluída, não o gênero Animação inteiro.
const ANIME_GENRE_ID = 16;

const isAnime = (r: RawTvResult): boolean =>
  (r.genre_ids ?? []).includes(ANIME_GENRE_ID) && (r.original_language === "ja" || (r.origin_country ?? []).includes("JP"));

// --- Ponderação por volume de voto (Bayesian average, "Top Rated" clássico
// do IMDb) --------------------------------------------------------------------
// Nota crua (vote_average) sozinha favorece show de nicho com fã-base
// pequena e devotada sobre sucesso de massa — reportado pela Rebecca ao
// vivo: "The Chosen" (966 votos) rankeava acima de Arcane (6138 votos),
// "Anne with an E" (4980 votos) acima de Stranger Things (21741 votos).
// Confirmado com a API: são os números REAIS do TMDb, não erro nosso —
// só que poucos votos tendem a vir só de fã fervoroso (nota alta), tanto
// que "nota crua" pura não é confiável até ter volume razoável de voto.
//
// A nota MOSTRADA no card continua sendo a real (`voteAverage`, sem
// modificar) — só a ORDEM da fileira muda, usando a fórmula bayesiana
// clássica do antigo "Top Rated" do IMDb:
//   ponderada = (v / (v + m)) × R + (m / (v + m)) × C
// v = vote_count do título, R = nota crua, m = quantos votos um título
// precisa pra sua própria nota pesar mais que a média do grupo, C = nota
// média do PRÓPRIO grupo buscado (calculado do pool de cada streaming,
// não um número fixo — catálogo de um streaming pode "puxar" mais alto/
// baixo que outro). Poucos votos → puxado pra perto de C; muitos votos →
// quase todo o peso vai pra nota própria.
const WEIGHTED_RATING_M = 1000;

const weightedRating = (voteAverage: number, voteCount: number, poolMean: number): number =>
  (voteCount / (voteCount + WEIGHTED_RATING_M)) * voteAverage + (WEIGHTED_RATING_M / (voteCount + WEIGHTED_RATING_M)) * poolMean;

// Candidatos vêm ordenados por VOLUME de voto (não nota crua) — garante
// que sucesso de massa entre na disputa; `sort_by=vote_average.desc`
// sozinho pode deixar um título assim fora das primeiras páginas
// enquanto nicho de nota alta/poucos votos ocupa o topo. Busca até
// CANDIDATE_PAGES páginas (a exclusão de anime também acontece aqui,
// client-side — TMDb não tem filtro pra excluir só "animação japonesa"
// no /discover, só o gênero Animação inteiro, que jogaria fora animação
// ocidental também) antes de aplicar a ponderação e cortar pro `limit`.
//
// `extraParams` é o que diferencia cada fileira por streaming
// (`fetchTopSeriesByProvider`) — passa `watch_region`/`with_watch_providers`/
// `with_watch_monetization_types`.
const CANDIDATE_PAGES = 5;

const fetchWeightedTopSeries = async (limit: number, extraParams: Record<string, string> = {}): Promise<SeriesRowItem[]> => {
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
    candidates.push(...data.results.filter((r) => !isAnime(r)));
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

export const fetchTopSeriesByProvider = (providerId: number, limit: number): Promise<SeriesRowItem[]> =>
  fetchWeightedTopSeries(limit, {
    watch_region: "BR",
    with_watch_providers: String(providerId),
    with_watch_monetization_types: "flatrate",
  });

// --- Carrossel de trailers (topo da página) ------------------------------------
// Pedido explícito da Rebecca, em três rodadas:
// 1) "trailer das séries mais populares da atualidade (com mais
//    avaliações)" — primeira versão usava fetchWeightedTopSeries (mesma
//    ponderação por nota das fileiras de streaming), sem filtro de ANO
//    nenhum.
// 2) Testado ao vivo, ficou errado: aparecia trailer de série antiga
//    (Breaking Bad, terminada em 2013) no carrossel — não fazia sentido
//    pra "atualidade". Trocado por `first_air_date_year={ano atual}` +
//    `sort_by=vote_count.desc`, sem ponderação de nota (pedido explícito:
//    "independente da pontuação").
// 3) Ainda errado — `first_air_date_year` é o ano da PRIMEIRA temporada
//    da série, não de qualquer temporada nova. Bug relatado ao vivo:
//    "cadê Casa do Dragão... se não for do ano de lançamento mas tiver
//    temporada nova no ano tem que estar". A Casa do Dragão estreou em
//    2022, mas tem temporada nova no ar esse ano — `first_air_date_year`
//    excluía ela (e qualquer série antiga com temporada nova). Corrigido
//    pra `air_date.gte`/`air_date.lte` (intervalo do ano atual inteiro,
//    1º de janeiro a 31 de dezembro) — filtra por QUALQUER episódio
//    (de qualquer temporada) caindo nesse intervalo, não só o primeiro
//    da série. Testado ao vivo: A Casa do Dragão entra (7º lugar).
//
// Efeito colateral aceito: `vote_count` é o total ACUMULADO da série
// inteira (todas as temporadas, desde sempre), não só desse ano — então
// série antiga ainda no ar (The Simpsons, Grey's Anatomy) tende a
// aparecer bem ranqueada mesmo se a temporada nova específica não for o
// que está "bombando" agora. Aceitável: é o mesmo tipo de proxy (volume
// de voto, sem pontuação) que a Rebecca já pediu explicitamente, e é
// consistente com o resto da página não ter acesso a dado de audiência
// real nenhum.
//
// Anime continua fora (mesma exclusão das fileiras de streaming, ver
// isAnime acima) — é a mesma vitrine de descoberta da página, não faz
// sentido esse carrossel ter critério diferente.
//
// Também usada pela fileira "Top 20 mais vistas no ano" (`index.tsx`,
// abaixo de "Minhas séries") — pedido explícito da Rebecca: "que segue o
// mesmo critério dos trailers". MESMA função, só `limit` diferente (5 pro
// carrossel, 20 pra fileira) — por isso pagina (`CANDIDATE_PAGES`, igual
// `fetchWeightedTopSeries`) em vez de uma página só: a primeira página do
// TMDb tem 20 resultados brutos, e a exclusão de anime client-side pode
// deixar menos que 20 sobrando nela, então busca página extra até
// preencher `limit` ou acabarem os resultados do ano.
export const fetchTopSeriesOfTheYear = async (limit: number): Promise<SeriesRowItem[]> => {
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
    collected.push(...data.results.filter((r) => !isAnime(r)).map(normalizeSeriesRowItem));
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

// Mesma lógica de home/dashboard/functions.ts (pickBestTrailer/isLikelyDubbed)
// — endpoint de série (`/tv/{id}/videos`) no lugar de filme.
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

export const fetchSeriesHeroTrailers = async (limit: number): Promise<HeroTrailer[]> => {
  const topSeries = await fetchTopSeriesOfTheYear(limit);

  const withTrailers = await Promise.all(
    topSeries.map(async (series): Promise<HeroTrailer | null> => {
      try {
        const data = await tmdbFetch<{ results: RawTmdbVideo[] }>(`/tv/${series.id}/videos`);
        const trailer = pickBestTrailer(data.results);
        return trailer ? { id: series.id, title: series.title, youtubeKey: trailer.key, isDubbed: isLikelyDubbed(trailer.name) } : null;
      } catch (err) {
        console.error(`Erro ao buscar trailer de ${series.title}:`, err);
        return null;
      }
    })
  );

  return withTrailers.filter((item): item is HeroTrailer => item !== null);
};

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
