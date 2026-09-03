// src/pages/private/home/dashboard/functions.ts
import { geminiGenerateJSON, type GeminiSchema } from "@/service/IASettings";
import { tmdbFetch, searchTmdbTitle, searchMovieByTitle, fetchTitleById, type TmdbMovie } from "@/service/TMDbSettings";
import { createTimeline, timelineMovieKey, type ContentType, type TimelineMovie } from "@/service/TimelineSettings";
import { fetchRecentlyWatchedKeys } from "@/service/WatchedSettings";
import { fetchIngressoNowPlaying } from "@/service/IngressoSettings";
import type { MovieRowItem } from "./MovieRow";

// Único lugar que ainda cria timeline a partir de um TmdbMovie "solto"
// (resultado de busca) — desde que o wizard saiu, a criação é só por
// descrição livre, então essa conversão não precisa mais viver em service/.
const toTimelineMovie = (movie: TmdbMovie): TimelineMovie => ({
  id: movie.id,
  mediaType: movie.mediaType,
  title: movie.title,
  year: movie.year,
  posterPath: movie.poster_path,
  watched: false,
  watchedAt: null,
});

// --- Últimos vistos ---------------------------------------------------------
// Lê DIRETO de users/{uid}/watched ordenado por watchedAt (query de
// verdade — orderBy + limit — não fetch de tudo + sort no client) —
// pedido explícito da Rebecca: "a lista de últimos vistos deve ser pelo
// user -> watched -> watched_at". Cada doc só guarda `watchedAt`
// (ver service/WatchedSettings.ts); a chave já tem `${mediaType}-${id}`
// do TMDb, então título/pôster são resolvidos aqui (fetchTitleById), não
// duplicados no Firestore. NÃO cruza mais com as timelines do usuário:
// antes um filme só entrava aqui se estivesse dentro de alguma timeline,
// o que escondia qualquer filme marcado "já vi" fora de timeline
// nenhuma (Em cartaz, busca, bilheteria) — bug real, silencioso.

export const getRecentlyWatched = async (uid: string, limit: number): Promise<DashboardMovie[]> => {
  const recent = await fetchRecentlyWatchedKeys(uid, limit);

  const resolved = await Promise.all(
    recent.map(async ({ key }): Promise<DashboardMovie | null> => {
      const [mediaType, idText] = key.split("-");
      if (mediaType !== "movie" && mediaType !== "tv") return null;
      const id = Number(idText);
      if (!Number.isFinite(id)) return null;

      const title = await fetchTitleById(mediaType, id);
      return title ? { id, mediaType, title: title.title, posterPath: title.posterPath } : null;
    })
  );

  return resolved.filter((movie): movie is DashboardMovie => movie !== null);
};

// --- Em cartaz / bilheteria (TMDb) ------------------------------------------
// Dados públicos, não pessoais — vêm direto do TMDb, sem passar pelo
// Firestore.

export interface DashboardMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
}

interface RawTmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
}

export const fetchNowPlayingBrazil = async (limit: number): Promise<DashboardMovie[]> => {
  const data = await tmdbFetch<{ results: RawTmdbMovie[] }>("/movie/now_playing", { region: "BR" });
  return data.results
    .slice(0, limit)
    .map((m) => ({ id: m.id, mediaType: "movie" as const, title: m.title, posterPath: m.poster_path }));
};

// --- Em cartaz de verdade (ingresso.com) + TMDb ------------------------------
// A LISTA (quais filmes) vem do ingresso.com de verdade (fetchIngressoNowPlaying,
// service/IngressoSettings.ts — pedido explícito da Rebecca: "os filmes que
// estão em cartaz não são os que estão mostrando lá na ingresso.com... o
// que deve estar ali são os mesmos filmes"). Mas cada título é resolvido
// no TMDb aqui (mesma fonte/mesmo pôster que o resto do app usa) — sem
// isso o card ficava com o pôster/estilo do ingresso.com (inconsistente
// com as outras fileiras) e sem `id`/`mediaType`, então sem botão de "já
// vi" nenhum (regressão relatada pela Rebecca: "não tem mais a mesma
// imagem dos outros filmes, e não [tem] o botão pra dar check").
//
// Título do ingresso.com não vem com ano — busca por nome só
// (searchMovieByTitle). Sufixo tipo "(Relançamento)"/"(Dublado)" não
// existe como filme separado no TMDb, então tenta primeiro sem esse
// sufixo (stripTrailingParenthetical) antes do título cru.
//
// Quando NENHUMA busca acha o filme no TMDb (ex.: show/concert film que
// não é cadastrado lá, tipo "Linkin Park: Unshatter") o filme continua
// aparecendo na lista — só sem id/mediaType (sem botão "já vi", ver
// MovieRow.tsx) e com o pôster do próprio ingresso.com como fallback, em
// vez de sumir da lista (regressão relatada: "não ta trazendo todos os
// filmes em cartaz").
const stripTrailingParenthetical = (title: string): string => title.replace(/\s*\([^)]*\)\s*$/, "").trim();

export const fetchIngressoNowPlayingResolved = async (citySlug: string, limit: number): Promise<MovieRowItem[]> => {
  const listed = await fetchIngressoNowPlaying(citySlug, limit);

  return Promise.all(
    listed.map(async (movie): Promise<MovieRowItem> => {
      const strippedTitle = stripTrailingParenthetical(movie.title);
      let match: TmdbMovie | null = null;
      try {
        match = await searchMovieByTitle(strippedTitle);
        if (!match && strippedTitle !== movie.title) {
          match = await searchMovieByTitle(movie.title);
        }
      } catch (err) {
        console.error(`Erro ao resolver "${movie.title}" no TMDb:`, err);
      }

      return match
        ? {
            id: match.id,
            mediaType: match.mediaType,
            title: movie.title,
            posterPath: match.poster_path,
            href: movie.movieUrl,
            rankLabel: "Comprar ingresso",
          }
        : { title: movie.title, posterUrl: movie.posterUrl, href: movie.movieUrl, rankLabel: "Comprar ingresso" };
    })
  );
};

// TMDb não tem "bilheteria" pronto, mas /discover/movie aceita
// sort_by=revenue.desc — é um proxy real (não inventado) pra "campeões de
// bilheteria do ano".
//
// PROBLEMA (relatado pela Rebecca): sem um piso de vote_count, esse sort
// vem contaminado por entradas com dado de revenue errado/vandalizado —
// o TMDb é editado pela comunidade, então um filme obscuro com 2 votos
// pode ter um campo revenue absurdo cadastrado errado (ou de propósito) e
// aparecer ranqueado acima de bilheterias de verdade. Um "campeão de
// bilheteria" de verdade sempre tem volume de voto real; exigir
// vote_count.gte corta esse ruído (mesma ideia já usada no sort "rating"
// do /discover do painel "criar timeline").
export const fetchBoxOfficeChampions = async (limit: number): Promise<DashboardMovie[]> => {
  const year = new Date().getFullYear();
  const data = await tmdbFetch<{ results: RawTmdbMovie[] }>("/discover/movie", {
    sort_by: "revenue.desc",
    primary_release_year: String(year),
    include_adult: "false",
    "vote_count.gte": "300",
  });
  return data.results
    .slice(0, limit)
    .map((m) => ({ id: m.id, mediaType: "movie" as const, title: m.title, posterPath: m.poster_path }));
};

// --- Carrossel de trailers (topo da home) ------------------------------------
// Resolve o trailer oficial de cada filme recebido via /movie/{id}/videos
// — só os que realmente têm um trailer do YouTube cadastrado entram no
// carrossel (nem todo filme tem).
//
// ANTES pegava os campeões de bilheteria do ano (fetchBoxOfficeChampions)
// — pedido explícito da Rebecca pra trocar: "os filmes que estamos
// exibindo são referente aos campeões de bilheteria... vamos mudar para
// mostrar os filmes em cartaz". Agora quem chama (`index.tsx`,
// `loadHeroTrailers`) passa os mesmos filmes JÁ resolvidos da fileira
// "Em cartaz em {cidade}" (a lista real do ingresso.com, ou o fallback
// TMDb quando ela falha) — não busca uma lista própria de novo, é
// literalmente o mesmo "em cartaz" que aparece embaixo, garantindo que
// os dois batem.

export interface HeroTrailer {
  id: number;
  title: string;
  youtubeKey: string;
  // Áudio dublado não tem faixa de legenda de verdade pra alternar — o
  // botão de legenda só aparece quando dá pra confirmar que NÃO é
  // dublado (ver isLikelyDubbed abaixo). Testado com a lista real de
  // bilheteria: com o idioma pt-BR (padrão do tmdbFetch), a esmagadora
  // maioria dos vídeos volta com o nome contendo "Dublado" — daí o botão
  // não fazer nada (bug relatado pela Rebecca).
  isDubbed: boolean;
}

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

// TMDb não marca "esse vídeo tem legenda cadastrada" em lugar nenhum do
// /videos — o nome do vídeo é o único sinal disponível, e distribuidoras
// brasileiras são consistentes em avisar "Dublado" vs "Legendado" no
// título. Sem essa palavra no nome, não dá pra confirmar que é dublado
// nem que tem legenda de verdade — trata como "não confirmado dublado"
// (mostra o botão) já que a queixa específica era só sobre os dublados.
const isLikelyDubbed = (name: string): boolean => /dublad[oa]/i.test(name);

export const fetchHeroTrailers = async (movies: { id: number; title: string }[]): Promise<HeroTrailer[]> => {
  const withTrailers = await Promise.all(
    movies.map(async (movie): Promise<HeroTrailer | null> => {
      try {
        const data = await tmdbFetch<{ results: RawTmdbVideo[] }>(`/movie/${movie.id}/videos`);
        const trailer = pickBestTrailer(data.results);
        return trailer
          ? { id: movie.id, title: movie.title, youtubeKey: trailer.key, isDubbed: isLikelyDubbed(trailer.name) }
          : null;
      } catch (err) {
        console.error(`Erro ao buscar trailer de ${movie.title}:`, err);
        return null;
      }
    })
  );

  return withTrailers.filter((item): item is HeroTrailer => item !== null);
};

// --- Busca ------------------------------------------------------------------
// Usada pelo modal global de busca (@/components/searchModal, ícone de
// lupa na navbar) — antes vivia num rodapé próprio de cada página
// (Filmes/Séries/Animes, 3 cópias quase idênticas), consolidado num só
// lugar: pedido explícito da Rebecca: "essa barra de search que a gente
// tem no final das páginas filmes/séries/animes pode sair dali e virar
// só um ícone de lupa no navbar". `/search/multi` já cobre filme E
// série/anime juntos — nenhuma das duas outras versões (`searchSeries`/
// `searchAnime`, removidas) filtrava por tipo de verdade, então nada de
// comportamento se perde.

interface RawTmdbMultiResult {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  poster_path: string | null;
}

export const searchMovies = async (query: string, limit: number): Promise<DashboardMovie[]> => {
  const data = await tmdbFetch<{ results: RawTmdbMultiResult[] }>("/search/multi", { query });
  return data.results
    .filter((r): r is RawTmdbMultiResult & { media_type: "movie" | "tv" } => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, limit)
    .map((r) => ({ id: r.id, mediaType: r.media_type, title: r.title ?? r.name ?? "Sem título", posterPath: r.poster_path }));
};

// --- Criar timeline por descrição livre -------------------------------------
// Painel "Criar uma nova timeline" do Dashboard: o usuário dá um TEMA
// livre (qualquer um — pessoa, franquia, gênero, década, estúdio, idioma,
// uma mistura disso) e o resultado tem que trazer TUDO relacionado a ele,
// sempre, sem depender de a descrição bater com um padrão específico que
// eu previ de antemão.
//
// IMPORTANTE (bug relatado pela Rebecca, duas vezes): pedir pra IA
// "enumerar de memória" uma lista longa e completa (ex.: "traga TODOS os
// filmes do Leonardo DiCaprio") não é confiável nem determinístico —
// mesmo problema que já resolvemos nas categorias de premiação do wizard.
// A primeira correção (classificar em "person"/"collection"/"general" e
// só tratar os dois primeiros casos de forma determinística) ainda errava
// o alvo: qualquer tema que não fosse literalmente "a filmografia de uma
// pessoa" ou "uma franquia exata" caía de novo na enumeração por IA — ou
// seja, a maioria dos temas reais continuava não-confiável.
//
// A abordagem certa não é classificar o tema em baldes fixos — é
// **traduzir o tema em filtros estruturados do TMDb** (gênero, palavra-
// chave, pessoa, estúdio, franquia, década, idioma, país, ordenação),
// combináveis entre si, e deixar o TMDb resolver a busca de verdade via
// paginação real (/discover, /person credits, /collection) — a IA nunca
// enumera título nenhum, só extrai os filtros do texto. Isso cobre
// QUALQUER tema que tenha algum eixo identificável. Só cai no fallback de
// enumeração por IA (best-effort) quando o tema é puramente subjetivo e
// não tem eixo estruturado nenhum (ex.: "filmes que emocionam").

export type TimelineCreationScope = "tudo" | "principais";

interface RawGenre {
  id: number;
  name: string;
}

interface GenreMaps {
  movie: Map<string, number>;
  tv: Map<string, number>;
}

let genreMapsCache: GenreMaps | null = null;

const getGenreMaps = async (): Promise<GenreMaps> => {
  if (genreMapsCache) return genreMapsCache;
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<{ genres: RawGenre[] }>("/genre/movie/list"),
    tmdbFetch<{ genres: RawGenre[] }>("/genre/tv/list"),
  ]);
  genreMapsCache = {
    movie: new Map(movieGenres.genres.map((g) => [g.name, g.id])),
    tv: new Map(tvGenres.genres.map((g) => [g.name, g.id])),
  };
  return genreMapsCache;
};

// --- Passo 1: tema livre → filtros estruturados (sem enumerar títulos) ------

interface ThemeFilters {
  mediaTypes: ("movie" | "tv")[];
  personName: string;
  personRole: "cast" | "director" | "";
  collectionQuery: string;
  companyQuery: string;
  genreNames: string[];
  keywordQueries: string[];
  yearFrom: number;
  yearTo: number;
  originalLanguage: string;
  originCountry: string;
  sortBy: "popularity" | "rating" | "release_date_desc" | "release_date_asc";
  scope: TimelineCreationScope;
  // Quantidade EXATA pedida (ex.: "10 melhores", "top 5") — tem
  // prioridade sobre `scope`, que só distingue "tudo" de "os principais"
  // sem número nenhum. 0 = usuário não pediu quantidade específica.
  limit: number;
  // TMDb não modela premiação nenhuma (não tem "venceu o Oscar" como
  // filtro) — esse é o único eixo que continua dependendo da IA pra
  // fato real (ver resolveAwardWinners), não pra enumerar título solto.
  awardName: string;
  awardCategory: string;
  awardWinnersOnly: boolean;
  awardFirstYear: number;
  awardYearFrom: number;
  awardYearTo: number;
  name: string;
}

const THEME_FILTERS_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    mediaTypes: { type: "ARRAY", items: { type: "STRING" } },
    personName: { type: "STRING" },
    personRole: { type: "STRING" },
    collectionQuery: { type: "STRING" },
    companyQuery: { type: "STRING" },
    genreNames: { type: "ARRAY", items: { type: "STRING" } },
    keywordQueries: { type: "ARRAY", items: { type: "STRING" } },
    yearFrom: { type: "INTEGER" },
    yearTo: { type: "INTEGER" },
    originalLanguage: { type: "STRING" },
    originCountry: { type: "STRING" },
    sortBy: { type: "STRING" },
    scope: { type: "STRING" },
    limit: { type: "INTEGER" },
    awardName: { type: "STRING" },
    awardCategory: { type: "STRING" },
    awardWinnersOnly: { type: "BOOLEAN" },
    awardFirstYear: { type: "INTEGER" },
    awardYearFrom: { type: "INTEGER" },
    awardYearTo: { type: "INTEGER" },
    name: { type: "STRING" },
  },
  // Praticamente tudo obrigatório de propósito — mesmo os campos "não
  // aplicável" (aí a instrução no prompt manda usar "" ou 0). Descoberto
  // ao vivo: campo fora de `required` pode vir OMITIDO pelo Gemini em
  // vez de vazio, mesmo quando claramente aplicável (ex.: pedido de
  // ajuste com "5 melhores" veio sem `limit` nenhum no JSON — o corte
  // final de quantidade simplesmente não acontecia, silenciosamente).
  // `normalizeThemeFilters` ainda cobre qualquer omissão residual, mas
  // isso reduz a chance de acontecer.
  required: [
    "mediaTypes",
    "personName",
    "personRole",
    "collectionQuery",
    "companyQuery",
    "genreNames",
    "keywordQueries",
    "yearFrom",
    "yearTo",
    "originalLanguage",
    "originCountry",
    "sortBy",
    "scope",
    "limit",
    "awardName",
    "awardCategory",
    "awardWinnersOnly",
    "awardFirstYear",
    "awardYearFrom",
    "awardYearTo",
    "name",
  ],
};

const extractThemeFilters = async (description: string, allGenreNames: string[]): Promise<ThemeFilters> => {
  const prompt = `Um usuário quer montar uma timeline de filmes e/ou séries a partir desse tema: "${description}".

Sua tarefa é SÓ traduzir esse tema em filtros de busca estruturados — você não vai listar títulos nenhum, só identificar os critérios, porque quem busca de verdade (de forma completa) é o TMDb, não você. A ÚNICA exceção é premiação (ver awardName abaixo) — o TMDb não tem esse dado, então é o único caso em que a busca de título acontece depois, edição por edição, não por você aqui.

Preencha:
- mediaTypes: array com "movie" e/ou "tv" — o que o tema pede (filme, série, ou os dois se não especificar).
- personName: nome completo de UMA pessoa real (ator/atriz/diretor), só se o tema for claramente sobre ela especificamente. Senão "".
- personRole: "cast" se for sobre atuação dela, "director" se for sobre direção. Senão "".
- collectionQuery: nome de busca de UMA franquia/saga específica (ex.: "Harry Potter"), só se o tema for claramente sobre ela. Senão "".
- companyQuery: nome de um estúdio/produtora específica (ex.: "Pixar", "A24"), só se o tema for sobre isso. Senão "".
- genreNames: 0 ou mais nomes EXATOS (cópia literal, sem alterar acentuação) dessa lista de gêneros reais do TMDb: [${allGenreNames.join(", ")}]. Só inclua se o tema mencionar gênero(s). IMPORTANTE: "anime" NÃO é sinônimo de "animação"/"desenho animado" — anime é especificamente animação japonesa (historicamente derivada de mangá). Sempre que o tema mencionar "anime" (não "desenho animado"/"animação" em geral), inclua "Animação" em genreNames E preencha originCountry com "JP" junto — sem isso a busca traria desenho animado ocidental (Pixar, Disney etc.) misturado, o que é errado. Se o tema pedir "desenho animado"/"animação" sem dizer "anime", NÃO adicione originCountry — aí é genérico mesmo, qualquer país.
- keywordQueries: 0 ou mais termos temáticos curtos, em inglês (como uma keyword do TMDb), pra temas específicos que não são gênero — ex.: "time travel", "based on true story", "artificial intelligence", "coming of age". Só use quando necessário pra capturar o tema. NÃO use isso pra tentar aproximar premiação (tipo "academy award winner") — premiação sempre vai em awardName, nunca em keyword, porque keyword do TMDb é só uma tag da comunidade, não a lista real de vencedores.
- yearFrom / yearTo: intervalo de anos se o tema mencionar época/década (ex.: "anos 90" → 1990/1999, "de 2020 pra cá" → 2020/ano atual). Use 0 em ambos se não aplicável. NÃO preencha isso pra premiação — use awardYearFrom/awardYearTo nesse caso.
- originalLanguage: código ISO 639-1 (ex.: "ja" japonês, "ko" coreano, "pt" português) se o tema pedir um idioma original específico. Senão "".
- originCountry: código ISO 3166-1 (ex.: "BR", "KR") se o tema pedir produções de um país específico. Senão "".
- sortBy: "rating" se pede os melhores/mais bem avaliados, "release_date_desc" se pede os mais recentes primeiro, "release_date_asc" se pede os mais antigos primeiro, senão "popularity".
- scope: "principais" SÓ se o usuário pedir explicitamente algo como "só os principais", "os mais conhecidos/populares", "um resumo", "não precisa ser tudo", "os melhores" (sem número). Em QUALQUER outro caso, inclusive quando o usuário não fala nada sobre quantidade, use "tudo" — é o padrão, já que o usuário não marca mais isso num checkbox separado, só pelo texto. Não vale pra premiação — aí "tudo" já significa todas as edições, não tem meio-termo.
- limit: um número EXATO, SE E SOMENTE SE o usuário mencionar uma quantidade específica (ex.: "10 melhores filmes de 2026" → 10, "top 5" → 5, "me dê 3 filmes de terror" → 3). Isso tem prioridade sobre "scope" — se o usuário pediu um número, é esse número, nem mais nem menos, mesmo que ele também tenha dito "melhores"/"principais" junto. Use 0 quando nenhuma quantidade específica foi mencionada.
- awardName: nome de UMA premiação de cinema/TV real (ex.: "Oscar", "Globo de Ouro", "BAFTA", "Emmy", "Festival de Cannes"), preenchido SÓ se o tema for claramente sobre vencedores/indicados dela. Senão "".
- awardCategory: categoria específica da premiação, em português como é chamada no Brasil (ex.: "Melhor Filme", "Melhor Atriz", "Melhor Diretor"). Se awardName estiver preenchido mas o tema não especificar categoria, use a categoria principal/mais importante da premiação (ex.: "Melhor Filme" pro Oscar). Senão "".
- awardWinnersOnly: true se o tema pede só quem GANHOU ("vencedores", "ganhadores", "venceu"), false se pede indicados/nomeados também ("indicados", "nomeados"). Se awardName estiver vazio, sempre true.
- awardFirstYear: ano da primeira edição dessa premiação — é um fato histórico bem conhecido (ex.: Oscar = 1929, Globo de Ouro = 1944, BAFTA = 1949, Emmy = 1949). 0 se awardName for "".
- awardYearFrom / awardYearTo: intervalo de EDIÇÕES (não confundir com yearFrom/yearTo, que são pra filtro de lançamento normal) se o tema limitar a um período (ex.: "da última década" = ano atual - 10 até ano atual). Use 0 em ambos pra "todas as edições, desde o início" quando o tema não limitar período nenhum (ex.: "todos os filmes vencedores de melhor filme do oscar" = 0/0, cobre desde 1929).
- name: nome curto (2 a 6 palavras) pra essa timeline, resumindo o tema, sem a palavra "Timeline" no início.

Um tema pode combinar vários filtros ao mesmo tempo (ex.: "terror coreano dos anos 2010" = genreNames:["Terror"] + originalLanguage:"ko" + yearFrom:2010 + yearTo:2019). Preencha só os campos que o tema realmente pede — não invente critério que não foi pedido. Responda só o JSON.`;

  return geminiGenerateJSON<ThemeFilters>(prompt, THEME_FILTERS_SCHEMA, true);
};

// Rede de segurança: só `mediaTypes`/`sortBy`/`scope`/`awardWinnersOnly`/
// `name` estão em `required` no schema — os outros campos (arrays e
// strings "não aplicável") o Gemini às vezes OMITE em vez de mandar
// vazio quando o tema não usa aquele eixo (bug real, visto ao vivo: uma
// pergunta sobre premiação veio sem `genreNames` no JSON, e
// `hasStructuredAxis` quebrou lendo `.length` de `undefined`). Normaliza
// tudo aqui uma vez, em vez de cada função downstream ter que tratar
// campo undefined por conta própria.
const normalizeThemeFilters = (filters: ThemeFilters, description: string): ThemeFilters => ({
  mediaTypes: filters.mediaTypes ?? [],
  personName: filters.personName ?? "",
  personRole: filters.personRole ?? "",
  collectionQuery: filters.collectionQuery ?? "",
  companyQuery: filters.companyQuery ?? "",
  genreNames: filters.genreNames ?? [],
  keywordQueries: filters.keywordQueries ?? [],
  yearFrom: filters.yearFrom ?? 0,
  yearTo: filters.yearTo ?? 0,
  originalLanguage: filters.originalLanguage ?? "",
  originCountry: filters.originCountry ?? "",
  sortBy: filters.sortBy ?? "popularity",
  scope: filters.scope ?? "tudo",
  limit: filters.limit ?? 0,
  awardName: filters.awardName ?? "",
  awardCategory: filters.awardCategory ?? "",
  awardWinnersOnly: filters.awardWinnersOnly ?? true,
  awardFirstYear: filters.awardFirstYear ?? 0,
  awardYearFrom: filters.awardYearFrom ?? 0,
  awardYearTo: filters.awardYearTo ?? 0,
  name: filters.name ?? description,
});

// --- Eixo: pessoa (ator/diretor) — /person/{id}/combined_credits ------------
// Endpoint já vem completo e determinístico pra tudo daquela pessoa; os
// outros filtros do tema (gênero, ano, idioma) são aplicados por cima como
// filtro local, já que cada crédito retorna genre_ids.

interface RawTmdbPerson {
  id: number;
}

interface RawTmdbCredit {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  character?: string; // só em cast
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  popularity?: number;
  vote_count?: number;
  order?: number; // só em cast
  job?: string; // só em crew
  genre_ids?: number[];
}

// combined_credits do TMDb mistura, no mesmo array de "cast", tanto papéis
// de verdade quanto ruído: aparições como "ele mesmo" em documentário
// sobre a própria carreira, making-of, talk show, homenagem, cameo não-
// creditado — nenhum desses é "um filme que a pessoa atuou" pro sentido
// comum do termo (a Rebecca testou com o Leonardo DiCaprio: sem esse
// filtro vinham 90 "filmes", sendo que ele tem ~32 papéis de verdade em
// longas — o resto era exatamente esse tipo de ruído). O gênero
// Documentário (id 99) e esses padrões de nome de personagem cobrem quase
// todo esse ruído.
const DOCUMENTARY_GENRE_ID = 99;
const NOISE_CHARACTER_PATTERN = /self|himself|herself|narrator|archive footage|uncredited/i;

interface CreditItem {
  movie: TimelineMovie;
  popularity: number;
  voteCount: number;
  order: number | null;
}

const creditToTimelineMovie = (item: RawTmdbCredit): TimelineMovie => ({
  id: item.id,
  mediaType: item.media_type,
  title: item.title ?? item.name ?? "Sem título",
  year: (item.release_date ?? item.first_air_date ?? "").slice(0, 4),
  posterPath: item.poster_path,
  watched: false,
  watchedAt: null,
});

const resolvePersonFilmography = async (
  filters: ThemeFilters,
  genreMaps: GenreMaps
): Promise<TimelineMovie[] | null> => {
  const search = await tmdbFetch<{ results: RawTmdbPerson[] }>("/search/person", { query: filters.personName });
  const person = search.results[0];
  if (!person) return null;

  const credits = await tmdbFetch<{ cast: RawTmdbCredit[]; crew: RawTmdbCredit[] }>(
    `/person/${person.id}/combined_credits`
  );

  const wantsDirector = filters.personRole === "director";
  const raw = wantsDirector ? credits.crew.filter((c) => c.job === "Director") : credits.cast;

  const genreIdWhitelist = new Set(
    filters.genreNames.flatMap((genreName) => {
      const ids = [genreMaps.movie.get(genreName), genreMaps.tv.get(genreName)];
      return ids.filter((id): id is number => id !== undefined);
    })
  );

  // Só filtra as aparições "como ele mesmo"/documentário quando o tema NÃO
  // pediu documentário explicitamente — se pediu, essas SÃO as aparições
  // que fazem sentido trazer.
  const excludeSelfAppearances = !genreIdWhitelist.has(DOCUMENTARY_GENRE_ID);

  const byKey = new Map<string, CreditItem>();
  for (const item of raw) {
    if (!item.title && !item.name) continue;
    if (filters.mediaTypes.length > 0 && !filters.mediaTypes.includes(item.media_type)) continue;
    if (genreIdWhitelist.size > 0 && !(item.genre_ids ?? []).some((id) => genreIdWhitelist.has(id))) continue;
    // sem data de lançamento = projeto rumorado/nunca saiu, não uma obra
    // de verdade que ele fez.
    if (!item.release_date && !item.first_air_date) continue;

    if (!wantsDirector && excludeSelfAppearances) {
      const character = item.character ?? "";
      if (!character.trim() || NOISE_CHARACTER_PATTERN.test(character)) continue;
      if ((item.genre_ids ?? []).includes(DOCUMENTARY_GENRE_ID)) continue;
    }

    const movie = creditToTimelineMovie(item);
    const year = Number(movie.year);
    if (filters.yearFrom && movie.year && year < filters.yearFrom) continue;
    if (filters.yearTo && movie.year && year > filters.yearTo) continue;

    const key = timelineMovieKey(movie);
    if (byKey.has(key)) continue;
    byKey.set(key, {
      movie,
      popularity: item.popularity ?? 0,
      voteCount: item.vote_count ?? 0,
      order: item.order ?? null,
    });
  }

  let items = Array.from(byKey.values());

  if (filters.scope === "principais") {
    items = items.filter((entry) => entry.voteCount >= 100 || (entry.order !== null && entry.order <= 15));
    items.sort((a, b) => b.popularity - a.popularity);
    items = items.slice(0, 20);
  } else {
    items.sort((a, b) => a.movie.year.localeCompare(b.movie.year));
  }

  return items.map((entry) => entry.movie);
};

// --- Eixo: premiação (Oscar, Globo de Ouro, BAFTA, Emmy...) -----------------
// TMDb não modela premiação nenhuma — não tem "venceu o Oscar de Melhor
// Filme" como filtro em lugar nenhum da API. É o único eixo que ainda
// depende da IA pra um FATO real (quem ganhou cada edição), não pra
// enumerar título solto de memória.
//
// BUG relatado pela Rebecca: "todos os filmes vencedores de melhor filme
// do Oscar" (98 edições desde 1929) voltou só 3 filmes, e nem eram
// vencedores de verdade — o extractThemeFilters (antes dessa correção)
// não tinha eixo nenhum pra premiação, então a IA tentava forçar isso
// numa keyword tipo "academy award winner", que é só uma tag de
// comunidade do TMDb, não a lista real de vencedores — resultado óbvio:
// lixo. A mesma lição das categorias de premiação do wizard antigo
// (edições diferentes têm categorias/vencedores diferentes, não dá pra
// confiar numa pergunta genérica) — só que agora precisa cobrir MUITAS
// edições de uma vez, não uma só.
//
// Pedir as ~98 edições numa tacada só arrisca vir incompleto mesmo com
// busca (mesmo problema de sempre: lista longa demais pra IA garantir
// que não pulou nenhuma). Em vez disso, quebra em lotes pequenos de
// edições (EDITIONS_PER_BATCH) e pede pra cada lote em paralelo — lotes
// menores são o que a IA consegue de fato conferir via busca sem pular
// nada.

interface AwardEntry {
  year: number;
  title: string;
  titleYear: number;
}

const AWARD_ENTRIES_SCHEMA: GeminiSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      year: { type: "INTEGER" },
      title: { type: "STRING" },
      titleYear: { type: "INTEGER" },
    },
    required: ["year", "title", "titleYear"],
  },
};

const EDITIONS_PER_BATCH = 15;

const fetchAwardBatch = async (
  awardName: string,
  category: string,
  winnersOnly: boolean,
  yearFrom: number,
  yearTo: number
): Promise<AwardEntry[]> => {
  const scopeText = winnersOnly ? "o VENCEDOR (só um por edição)" : "TODOS os indicados (não só o vencedor)";

  const prompt = `Liste ${scopeText} da categoria "${category}" do prêmio "${awardName}", em CADA edição realizada entre os anos ${yearFrom} e ${yearTo} (uma edição por ano nessa faixa — pule anos em que comprovadamente não houve cerimônia).

Use a busca do Google pra confirmar a lista completa e correta antes de responder — isso é bem documentado (ex.: a Wikipédia tem tabela completa de vencedores/indicados por categoria de cada premiação, ano a ano), não confie só na memória. Não pule NENHUMA edição dentro dessa faixa de anos.

Pra cada edição: year (ano em que a cerimônia aconteceu), title (título original da obra, como apareceria numa busca no TMDb) e titleYear (ano de lançamento da obra — pode ser o mesmo ano da cerimônia ou o anterior). Responda só o JSON.`;

  return geminiGenerateJSON<AwardEntry[]>(prompt, AWARD_ENTRIES_SCHEMA, true);
};

const resolveAwardWinners = async (filters: ThemeFilters): Promise<TimelineMovie[]> => {
  const yearFrom = filters.awardYearFrom || filters.awardFirstYear;
  const yearTo = filters.awardYearTo || new Date().getFullYear();
  if (!yearFrom || !filters.awardCategory) return [];

  const batches: [number, number][] = [];
  for (let start = yearFrom; start <= yearTo; start += EDITIONS_PER_BATCH) {
    batches.push([start, Math.min(start + EDITIONS_PER_BATCH - 1, yearTo)]);
  }

  const results = await Promise.all(
    batches.map(([from, to]) =>
      fetchAwardBatch(filters.awardName, filters.awardCategory, filters.awardWinnersOnly, from, to).catch((err) => {
        console.error(`Erro ao buscar ${filters.awardName} (${filters.awardCategory}) ${from}-${to}:`, err);
        return [] as AwardEntry[];
      })
    )
  );

  const entries = results.flat();
  const mediaType = filters.mediaTypes[0] ?? "movie";

  const resolved = await Promise.all(entries.map((entry) => searchTmdbTitle(entry.title, entry.titleYear, mediaType)));

  const byKey = new Map<string, TimelineMovie>();
  for (const movie of resolved) {
    if (!movie) continue;
    const timelineMovie = toTimelineMovie(movie);
    byKey.set(timelineMovieKey(timelineMovie), timelineMovie);
  }

  return Array.from(byKey.values()).sort((a, b) => a.year.localeCompare(b.year));
};

// --- Eixo: franquia/coleção — /collection -------------------------------

interface RawTmdbCollectionSearch {
  id: number;
}

interface RawTmdbCollectionPart {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  popularity?: number;
}

const resolveCollectionMovies = async (
  collectionQuery: string,
  scope: TimelineCreationScope
): Promise<TimelineMovie[] | null> => {
  const search = await tmdbFetch<{ results: RawTmdbCollectionSearch[] }>("/search/collection", {
    query: collectionQuery,
  });
  const collection = search.results[0];
  if (!collection) return null;

  const detail = await tmdbFetch<{ parts: RawTmdbCollectionPart[] }>(`/collection/${collection.id}`);

  let parts = detail.parts;
  if (scope === "principais") {
    parts = [...parts].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, 20);
  }

  return parts
    .map(
      (part): TimelineMovie => ({
        id: part.id,
        mediaType: "movie",
        title: part.title,
        year: (part.release_date ?? "").slice(0, 4),
        posterPath: part.poster_path,
        watched: false,
        watchedAt: null,
      })
    )
    .sort((a, b) => a.year.localeCompare(b.year));
};

// --- Eixo: gênero/palavra-chave/estúdio/época/idioma/país — IA com busca ---
// real (Google) + resolução no TMDb -----------------------------------------
// ANTES isso era resolvido só com /discover do TMDb (filtro puro por tag
// no banco dele). PROBLEMA relatado pela Rebecca: pra tema com nuance
// que a tag não capta bem — o caso concreto foi anime — o resultado do
// /discover vinha fraco (o filtro genreNames="Animação" +
// originCountry="JP" existe no TMDb, mas o ranking/curadoria daquilo não
// reflete o que a comunidade realmente considera bom anime; é só o que
// está marcado daquele jeito no banco, ordenado por popularidade CRUA do
// TMDb). A crítica dela foi direta: "não deveria estar atrelado a um
// site, a gente perde a potência da IA" — só resolver via TMDb.discover
// jogava fora justamente a capacidade da IA de pesquisar a internet de
// verdade (Google Search, com grounding) e achar o que comunidades/
// crítica realmente apontam como referência (ex.: MyAnimeList pra anime,
// Letterboxd/Rotten Tomatoes pra filme em geral).
//
// Por isso agora quem MONTA a lista é a IA com busca de verdade — os
// critérios já extraídos (gênero, país, idioma, época, ordenação,
// quantidade) entram como instrução explícita no prompt (então "anime"
// continua implicando Japão, por exemplo), mas quem decide os títulos
// de verdade é a busca real, não uma tag de banco. O TMDb entra só
// DEPOIS, pra resolver cada título nomeado (id, pôster) — exatamente o
// papel que ele já tem em pessoa/coleção/premiação, não o de "motor de
// descoberta".
interface AiSearchItem {
  title: string;
  year: number;
  mediaType: "movie" | "tv";
}

const AI_SEARCH_SCHEMA: GeminiSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      year: { type: "INTEGER" },
      mediaType: { type: "STRING" },
    },
    required: ["title", "year", "mediaType"],
  },
};

// Tema genérico (gênero/época/etc., sem pessoa/franquia/premiação) não
// tem um "total real" natural pra travar em — ao contrário de "todos os
// filmes do DiCaprio" (limitado pelo que ele realmente fez) ou "todos os
// vencedores do Oscar" (limitado pelo número de edições), "todo anime de
// ação" não tem fim. Por isso, sem uma quantidade explícita do usuário,
// usa um teto razoável em vez de fingir que existe uma lista fechada.
const AI_SEARCH_LIMIT_MAIN = 20;
const AI_SEARCH_LIMIT_ALL = 40;

const describeFiltersForPrompt = (filters: ThemeFilters): string => {
  const parts: string[] = [];
  if (filters.genreNames.length) parts.push(`gênero(s): ${filters.genreNames.join(", ")}`);
  if (filters.keywordQueries.length) parts.push(`temas específicos: ${filters.keywordQueries.join(", ")}`);
  if (filters.yearFrom || filters.yearTo) {
    parts.push(`período de lançamento: ${filters.yearFrom || "início"} até ${filters.yearTo || "hoje"}`);
  }
  if (filters.originalLanguage) parts.push(`idioma original: ${filters.originalLanguage}`);
  if (filters.originCountry) parts.push(`país de origem da produção: ${filters.originCountry}`);
  if (filters.companyQuery) parts.push(`estúdio/produtora: ${filters.companyQuery}`);
  if (filters.mediaTypes.length) parts.push(`formato: ${filters.mediaTypes.join(" e/ou ")}`);
  parts.push(`ordenar por: ${filters.sortBy}`);
  return parts.length > 0 ? parts.join("; ") : "(nenhum critério adicional identificado)";
};

// `mediaTypeLock` força o resultado a um tipo só — usado pelo painel
// "criar timeline" da página Séries (ver resolveTimelineMovies): reforça
// no PRÓPRIO PROMPT ("só séries") e, como rede de segurança (a IA já
// errou instrução parecida antes — mesma lição de "não pule nenhuma
// edição" na premiação, texto sozinho não é garantia), filtra o
// resultado depois também.
const resolveByAiSearch = async (
  filters: ThemeFilters,
  description: string,
  mediaTypeLock?: "movie" | "tv"
): Promise<TimelineMovie[]> => {
  const exact = filters.limit > 0;
  const targetCount = exact ? filters.limit : filters.scope === "principais" ? AI_SEARCH_LIMIT_MAIN : AI_SEARCH_LIMIT_ALL;
  const lockInstruction =
    mediaTypeLock === "tv"
      ? " IMPORTANTE: traga SÓ séries de TV (mediaType sempre \"tv\") — nunca filme/longa, mesmo que o pedido mencione algo relacionado a um filme."
      : mediaTypeLock === "movie"
        ? " IMPORTANTE: traga SÓ filmes/longas (mediaType sempre \"movie\") — nunca série de TV."
        : "";

  const prompt = `Um usuário quer montar uma timeline de filmes e/ou séries a partir desse pedido: "${description}".${lockInstruction}

Critérios já identificados a partir do pedido: ${describeFiltersForPrompt(filters)}.

Use a busca do Google de verdade (não confie só na sua memória) pra montar essa lista com títulos REAIS — considere fontes relevantes pro tipo de pedido (ex.: MyAnimeList/Anilist se for anime, Letterboxd/Rotten Tomatoes/Metacritic se for avaliação de crítica, listas "melhores de" de veículos confiáveis). Não invente título nem misture com obra errada.

Traga ${exact ? `EXATAMENTE ${targetCount}` : `até ${targetCount}`} títulos, os que melhor combinam com o pedido e os critérios acima, na ordem pedida (${filters.sortBy}).

Pra cada título: title (nome original, como apareceria numa busca no TMDb), year (ano de lançamento/estreia) e mediaType ("movie" pra filme/longa, "tv" pra série — anime em formato de série também é "tv"). Responda só o JSON.`;

  const items = await geminiGenerateJSON<AiSearchItem[]>(prompt, AI_SEARCH_SCHEMA, true);

  const resolved = await Promise.all(items.map((item) => searchTmdbTitle(item.title, item.year, item.mediaType)));

  const byKey = new Map<string, TimelineMovie>();
  for (const movie of resolved) {
    if (!movie) continue;
    if (mediaTypeLock && movie.mediaType !== mediaTypeLock) continue;
    const timelineMovie = toTimelineMovie(movie);
    byKey.set(timelineMovieKey(timelineMovie), timelineMovie);
  }
  return Array.from(byKey.values());
};

// --- Conversa do modal de criação -------------------------------------------
// BUG relatado pela Rebecca: o modal tratava TODA mensagem do usuário
// como um pedido de ajuste — reprocessava a busca inteira de novo, sem
// responder nada. Se o usuário só fazia uma pergunta ("qual a referência
// que você tá usando?") ou dava um feedback vago ("essa lista tá
// errada", sem dizer o quê), refazer a busca com o mesmo contexto só
// devolvia A MESMA lista de novo — porque não tinha informação nova
// nenhuma pra busca usar. Parecia o app "não estar conversando".
//
// Correção: toda mensagem passa primeiro por essa função, que decide se
// é (a) só uma pergunta/comentário — responde em texto de verdade, sem
// tocar na busca — ou (b) um pedido de ajuste concreto — responde
// confirmando e sinaliza pro modal reprocessar. Não usa busca do Google
// (não é fato do mundo real, é só o app explicando o próprio
// funcionamento e decidindo o que fazer com a mensagem).

export interface ChatTurnResult {
  reply: string;
  isRefinement: boolean;
}

const CHAT_TURN_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    isRefinement: { type: "BOOLEAN" },
  },
  required: ["reply", "isRefinement"],
};

export const respondToTimelineChat = async (
  originalDescription: string,
  priorAdjustments: string[],
  currentMovieTitles: string[],
  userMessage: string
): Promise<ChatTurnResult> => {
  const priorText =
    priorAdjustments.length > 0 ? priorAdjustments.map((msg, i) => `${i + 1}. ${msg}`).join("\n") : "(nenhum ainda)";
  const titlesText = currentMovieTitles.slice(0, 40).join(", ") || "(nenhum título ainda)";

  const prompt = `Você é o assistente de um app que monta timelines de filmes/séries a partir de um pedido em texto livre. O usuário está num modal de ajuste, revisando o resultado antes de salvar, e acabou de mandar uma mensagem.

Pedido original: "${originalDescription}"
Ajustes já pedidos antes dessa mensagem: ${priorText}
Lista atual mostrada pro usuário (${currentMovieTitles.length} título(s) no total, mostrando até 40 aqui): ${titlesText}

Como o sistema funciona de verdade (pra você poder explicar se for perguntado): o pedido é traduzido em critérios (gênero, ano, pessoa, franquia, estúdio, premiação, ordenação, quantidade exata etc.). Pra pessoa específica e franquia específica, a lista vem direto do catálogo do TMDb (completo, garantido). Pra premiação, vem de busca com fontes reais tipo Wikipédia, edição por edição. Pra tema geral (gênero/época/etc., o caso mais comum), a lista vem de busca de verdade no Google — não só do catálogo de um site só — considerando fontes relevantes pro tipo de pedido (ex.: MyAnimeList pra anime, Letterboxd/Rotten Tomatoes pra crítica de filme em geral); o TMDb aí só resolve cada título nomeado (id, pôster), não decide a lista. Em nenhum caso é uma lista inventada de memória sem busca.

Mensagem nova do usuário: "${userMessage}"

Responda:
- reply: uma resposta curta, direta e honesta em português, conversando de verdade com o usuário — nunca finja que não entendeu e nunca ignore a pergunta. Se ele perguntou algo (ex.: "qual a referência que você tá usando", "por que veio isso", "de onde vêm esses filmes"), EXPLIQUE de verdade como a busca provavelmente interpretou o pedido original (cite os critérios prováveis: gênero, ano, ordenação etc.). Se ele deu um feedback vago tipo "tá errado"/"não é isso" sem dizer o que especificamente mudar, PERGUNTE de volta o que está errado (gênero errado? ano errado? faltou/sobrou título? um título específico?) — não tente adivinhar sozinho. Se ele pediu uma mudança concreta (ex.: "só os 5 melhores", "tira anime", "de 2020 pra frente"), confirme objetivamente o que você vai mudar.
- isRefinement: true SÓ se a mensagem tiver um pedido concreto de mudança na busca. false se for só uma pergunta, comentário ou feedback vago sem instrução específica — nesses casos NÃO tem nada novo pra busca usar, então não refaça a busca (só responda).

Responda só o JSON.`;

  return geminiGenerateJSON<ChatTurnResult>(prompt, CHAT_TURN_SCHEMA, false);
};

// --- Resolução (sem gravar) — usada pelo modal de preview/ajuste -----------
// Separado de createTimelineFromDescription pra dar pro painel mostrar o
// resultado ANTES de gravar em qualquer lugar, com chance de ajustar o
// pedido (CreateTimelineModal.tsx) — só grava quando o usuário confirma.

export interface ResolvedTimelineDraft {
  name: string;
  types: ContentType[];
  movies: TimelineMovie[];
}

// `categoryLock` — painel "criar timeline" tem TRÊS instâncias agora: a
// da Home (área de Filmes, sem lock, comportamento de sempre), a da
// página Séries (`categoryLock: "series"`, pedido explícito da Rebecca:
// "a barra... os resultados devem ser só séries... e a timeline criada
// já sai marcada com categoria series") e a da página Animes
// (`categoryLock: "animes"`, mesmo pedido, "mesma lógica e layout" da
// Séries). Quando setado:
// - "series"/"animes" força `filters.mediaTypes = ["tv"]` (afeta o eixo
//   pessoa, que já filtra por `filters.mediaTypes`, e o prompt/filtro
//   final da busca por IA) e pula o eixo franquia inteiro — `/collection`
//   do TMDb só modela franquia de FILME, travar em "tv" e ainda assim
//   tentar esse eixo não acharia nada de útil.
// - "animes" ADICIONALMENTE injeta gênero "Animação" + país de origem
//   "JP" nos filtros (mesma definição de anime usada em
//   pages/private/series/functions.ts, `isAnime`) — sem isso "animes"
//   cairia no mesmo path de "series" e traria desenho ocidental junto.
//   `describeFiltersForPrompt` já inclui esses dois critérios no prompt
//   da busca por IA automaticamente, não precisa de instrução própria.
export interface ResolveTimelineOptions {
  // Pula o eixo franquia/coleção (`/collection` do TMDb) mesmo quando o
  // tema é claramente sobre uma franquia — usado pelas páginas de
  // Franquia (pages/private/franchise), que precisam de filmes E séries
  // juntos: `/collection` do TMDb só modela FILME (resolveCollectionMovies
  // sempre grava mediaType "movie"), então uma franquia com spin-off de
  // série (Marvel, Star Wars, Percy Jackson...) ficaria sem a parte de
  // série nenhuma se esse eixo "ganhasse" primeiro. Pulando ele, o fluxo
  // cai direto no eixo de busca por IA (Google Search com grounding, ver
  // resolveByAiSearch) — que já lida bem com "filmes e séries" misturados
  // (mediaTypes com os dois valores), igual já faz pra qualquer tema
  // geral sem eixo determinístico específico.
  skipCollectionAxis?: boolean;
}

export const resolveTimelineMovies = async (
  description: string,
  categoryLock?: ContentType,
  options: ResolveTimelineOptions = {}
): Promise<ResolvedTimelineDraft> => {
  const genreMaps = await getGenreMaps();
  const allGenreNames = Array.from(new Set([...genreMaps.movie.keys(), ...genreMaps.tv.keys()]));
  const rawFilters = await extractThemeFilters(description, allGenreNames);
  const filters = normalizeThemeFilters(rawFilters, description);

  const isTvLocked = categoryLock === "series" || categoryLock === "animes";
  if (isTvLocked) filters.mediaTypes = ["tv"];
  if (categoryLock === "animes") {
    if (!filters.genreNames.includes("Animação")) filters.genreNames = [...filters.genreNames, "Animação"];
    filters.originCountry = "JP";
  }

  let movies: TimelineMovie[] | null = null;

  if (filters.awardName) {
    movies = await resolveAwardWinners(filters);
  } else if (filters.personName) {
    movies = await resolvePersonFilmography(filters, genreMaps);
  } else if (filters.collectionQuery && !isTvLocked && !options.skipCollectionAxis) {
    movies = await resolveCollectionMovies(filters.collectionQuery, filters.scope);
  }

  // Sem eixo determinístico específico (não é pessoa/franquia/premiação)
  // — ou o eixo específico não achou nada (nome digitado errado, obscuro
  // demais) — resolve com busca de verdade na internet (IA com Google
  // Search), usando os critérios já extraídos (gênero, país, época,
  // ordenação, quantidade) como instrução; o TMDb só entra depois, pra
  // resolver cada título nomeado (id, pôster), nunca pra decidir a lista.
  if (movies === null || movies.length === 0) {
    movies = await resolveByAiSearch(filters, description, isTvLocked ? "tv" : undefined);
  }

  if (movies.length === 0) {
    throw new Error("Não encontramos nenhum título pra esse tema.");
  }

  // Rede de segurança final — qualquer eixo (pessoa/coleção/premiação
  // incluídos) que ainda assim tenha vindo com mais títulos do que a
  // quantidade exata pedida é cortado aqui, garantindo que "10 melhores"
  // realmente vira 10, não 40.
  if (filters.limit > 0 && movies.length > filters.limit) {
    movies = movies.slice(0, filters.limit);
  }

  // Categoria fixa pelo painel que chamou, não mais calculada
  // dinamicamente por mediaType dos títulos resolvidos.
  const types: ContentType[] = [categoryLock ?? "filmes"];

  const name = `Timeline ${filters.name || description}`;

  return { name, types, movies };
};

// --- Entrada única do painel --------------------------------------------------
// Continua existindo pra quem quiser criar direto sem passar pelo modal
// de ajuste — hoje o painel usa o modal (CreateTimelineModal.tsx), que
// chama resolveTimelineMovies + createTimeline (service/TimelineSettings)
// separadamente.

export interface CreateTimelineFromDescriptionResult {
  timelineId: string;
  name: string;
  movieCount: number;
}

export const createTimelineFromDescription = async (
  uid: string,
  description: string
): Promise<CreateTimelineFromDescriptionResult> => {
  const draft = await resolveTimelineMovies(description);
  // followed=true — mesma regra do modal (CreateTimelineModal.tsx): toda
  // timeline criada deliberadamente já entra seguida.
  const timelineId = await createTimeline(uid, draft.name, draft.types, draft.movies, { followed: true });
  return { timelineId, name: draft.name, movieCount: draft.movies.length };
};
