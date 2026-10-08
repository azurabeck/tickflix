// Cria uma timeline a partir de um texto livre ("filmes do Nolan", "terror dos anos 80").
// 1. O Gemini traduz o texto em filtros estruturados (pessoa, franquia, premiação, gênero...).
// 2. Cada tipo de filtro tem um resolvedor: filmografia e franquia vêm do catálogo do TMDb,
//    premiação e temas gerais vêm de busca do Gemini com cada título conferido no TMDb.
import { geminiGenerateJSON, type GeminiSchema } from "@/service/IASettings";
import { tmdbFetch, searchTmdbTitle, type TmdbMovie } from "@/service/TMDbSettings";
import { timelineMovieKey, type ContentType, type TimelineMovie } from "@/actions/helpers/timelines";

const toTimelineMovie = (movie: TmdbMovie): TimelineMovie => ({
  id: movie.id,
  mediaType: movie.mediaType,
  title: movie.title,
  year: movie.year,
  posterPath: movie.poster_path,
  watched: false,
  watchedAt: null,
});

type TimelineCreationScope = "tudo" | "principais";

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
  limit: number;
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

interface RawTmdbPerson {
  id: number;
}

interface RawTmdbCredit {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  character?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  popularity?: number;
  vote_count?: number;
  order?: number;
  job?: string;
  genre_ids?: number[];
}

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

  const excludeSelfAppearances = !genreIdWhitelist.has(DOCUMENTARY_GENRE_ID);

  const byKey = new Map<string, CreditItem>();
  for (const item of raw) {
    if (!item.title && !item.name) continue;
    if (filters.mediaTypes.length > 0 && !filters.mediaTypes.includes(item.media_type)) continue;
    if (genreIdWhitelist.size > 0 && !(item.genre_ids ?? []).some((id) => genreIdWhitelist.has(id))) continue;

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

interface ChatTurnResult {
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

// Responde uma mensagem do chat de ajuste da timeline e diz se ela pede mudança na lista.
// usado em: helpers/createtimeline
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

export interface ResolvedTimelineDraft {
  name: string;
  types: ContentType[];
  movies: TimelineMovie[];
}

interface ResolveTimelineOptions {
  skipCollectionAxis?: boolean;
}

// Transforma uma descrição em texto livre numa lista de títulos reais (IA + TMDb).
// usado em: franchises/dashboard, helpers/createtimeline
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

  if (movies === null || movies.length === 0) {
    movies = await resolveByAiSearch(filters, description, isTvLocked ? "tv" : undefined);
  }

  if (movies.length === 0) {
    throw new Error("Não encontramos nenhum título pra esse tema.");
  }

  if (filters.limit > 0 && movies.length > filters.limit) {
    movies = movies.slice(0, filters.limit);
  }

  const types: ContentType[] = [categoryLock ?? "filmes"];

  const name = `Timeline ${filters.name || description}`;

  return { name, types, movies };
};
