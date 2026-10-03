// src/service/TMDbSettings.ts
// Client fino pro TMDb (The Movie Database) — usado em todo o app pra
// buscar filme/série. Usa o token v4 (Read Access Token, formato JWT —
// themoviedb.org/settings/api) via header `Authorization: Bearer`, não a
// api_key v3 antiga por query param. Mesma lógica do apiKey do Firebase:
// não é segredo de verdade pra esse uso de leitura pública, quem limita
// abuso é o próprio TMDb por rate limit — então chamamos direto do
// browser sem precisar de Cloud Function.

import i18n, { TMDB_LANGUAGE_BY_APP_LANGUAGE, type SupportedLanguage } from "./i18n";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
// Imagem maior — só pro fundo do modal de detalhes do filme/série
// (MovieDetail), onde um pôster em w342 ficaria borrado esticado full-width.
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
// Backdrop (imagem de cena, paisagem) em tamanho de CARD — w780 é o
// meio-termo do TMDb (w300 fica borrado em tela retina, w1280 é pesado
// demais pra dezenas de cards numa fileira).
export const TMDB_BACKDROP_CARD_BASE = "https://image.tmdb.org/t/p/w780";
export const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";
// Logo de provedor de streaming ("onde assistir") — w92 é o menor
// tamanho oficial do TMDb pra isso, mais que suficiente pro ícone
// pequeno da lista de provedores.
export const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

// Exportado (não é segredo de verdade, ver comentário acima) — o prompt
// copiável do AddDataModal.tsx (página Oscar) precisa dele pra passar
// pra IA externa pesquisar no TMDb.
export const READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_API_KEY;

// Idioma dos dados (título/sinopse/gênero etc.) acompanha o idioma do
// site — pedido explícito da Rebecca: "os dados que vêm do TMDb...
// [devem] acompanha[r] o idioma do site". `i18n.language` pode vir como
// código curto ("pt") ou locale completo do navegador ("en-US"); só os 2
// primeiros caracteres importam aqui pra achar o código TMDb certo
// (`TMDB_LANGUAGE_BY_APP_LANGUAGE`, service/i18n.ts). Sem idioma
// suportado reconhecido, cai pro português (mesmo padrão de sempre).
const DEFAULT_TMDB_LANGUAGE = "pt-BR";

const currentTmdbLanguage = (): string => {
  const short = (i18n.language ?? "pt").slice(0, 2) as SupportedLanguage;
  return TMDB_LANGUAGE_BY_APP_LANGUAGE[short] ?? DEFAULT_TMDB_LANGUAGE;
};

// --- Limite de concorrência -------------------------------------------------
// Bug real, visto ao vivo testando a Home logo após logar: a página
// dispara "Últimos vistos" + "Em cartaz" + "Campeões de bilheteria" +
// "Principais lançamentos" praticamente juntas, cada uma com várias
// chamadas por filme (disponibilidade BR/US, data de estreia, trailer
// etc.) — tudo em paralelo, sem limite nenhum. Na prática isso soma
// bem mais de 100 requisições simultâneas pro TMDb logo no primeiro
// carregamento, e o TMDb responde boa parte com 429 (Too Many Requests)
// — causa raiz real da claquete "às vezes aparece, às vezes não"
// relatada pela Rebecca (ver @/components/movieDetail/functions.ts):
// não é falha de rede aleatória, é throttling de verdade, sistemático,
// toda vez que várias fileiras carregam juntas.
//
// DUAS garantias, não só uma — testado ao vivo: um semáforo de
// concorrência sozinho (15 em voo ao mesmo tempo) ainda gerava uma
// enxurrada de 429 real (confirmado: ~200 erros no console só de abrir a
// Home) — o limite do TMDb parece ser de TAXA (quantas requisições por
// segundo, não só quantas em paralelo nesse instante); com round-trips
// rápidos, até "só" 15 concorrentes disparam dezenas por segundo.
//
// 1) Concorrência: no máximo `MAX_CONCURRENT_REQUESTS` chamadas em voo
//    ao mesmo tempo pro TMDb inteiro, não por fileira — o resto espera
//    na fila (`waitQueue`).
// 2) Espaçamento: nenhuma chamada DISPARA menos de `MIN_DISPATCH_GAP_MS`
//    depois da anterior, não importa a concorrência disponível —
//    `nextDispatchAt` é um relógio compartilhado que todo mundo respeita
//    antes de seguir. Isso cap a TAXA de disparo em ~1000/MIN_DISPATCH_GAP_MS
//    por segundo, independente de quantos slots de concorrência estejam
//    livres.
const MAX_CONCURRENT_REQUESTS = 6;
const MIN_DISPATCH_GAP_MS = 120; // ~8 disparos/s no máximo, bem abaixo de qualquer limite informal conhecido do TMDb

let activeRequests = 0;
const waitQueue: (() => void)[] = [];
let nextDispatchAt = 0;

const acquireSlot = (): Promise<void> => {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waitQueue.push(resolve));
};

const releaseSlot = (): void => {
  const next = waitQueue.shift();
  if (next) next(); // repassa o lugar direto pro próximo da fila, sem decrementar
  else activeRequests--;
};

const waitForDispatchGap = async (): Promise<void> => {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextDispatchAt);
  nextDispatchAt = scheduledAt + MIN_DISPATCH_GAP_MS;
  const delay = scheduledAt - now;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
};

const requestTmdb = (url: string): Promise<Response> =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${READ_ACCESS_TOKEN}`,
      accept: "application/json",
    },
  });

export const tmdbFetch = async <T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> => {
  if (!READ_ACCESS_TOKEN) {
    throw new Error("VITE_TMDB_API_KEY não configurada — ver .env.example.");
  }

  const query = new URLSearchParams({ language: currentTmdbLanguage(), ...params });
  const url = `${TMDB_BASE_URL}${path}?${query.toString()}`;

  await acquireSlot();
  try {
    await waitForDispatchGap();
    let response = await requestTmdb(url);

    // Mesmo com o limite de concorrência, um 429 isolado ainda pode
    // acontecer (ex.: pico breve de outra aba/sessão) — uma nova
    // tentativa DENTRO do mesmo slot (não libera o lugar antes, senão
    // outra chamada da fila entra e mantém o mesmo estrangulamento).
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      response = await requestTmdb(url);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = body?.status_message;
      throw new Error(`TMDb respondeu ${response.status} em ${path}${detail ? `: ${detail}` : ""}`);
    }

    return response.json() as Promise<T>;
  } finally {
    releaseSlot();
  }
};

export const posterUrl = (path: string | null): string | null => (path ? `${TMDB_IMAGE_BASE}${path}` : null);

export const backdropCardUrl = (path: string | null | undefined): string | null => (path ? `${TMDB_BACKDROP_CARD_BASE}${path}` : null);

// --- Busca de título solto ---------------------------------------------------
// Usado sempre que já se sabe o nome/ano/tipo de um título (vindo de uma
// lista da IA ou digitado no rodapé) e falta só resolver o id/pôster reais
// no TMDb — ex.: painel "criar timeline por descrição" (home/dashboard).

export interface TmdbMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  poster_path: string | null;
}

interface RawTmdbResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
}

const normalizeResult = (item: RawTmdbResult, mediaType: "movie" | "tv"): TmdbMovie => ({
  id: item.id,
  mediaType,
  title: item.title ?? item.name ?? "Sem título",
  year: (item.release_date ?? item.first_air_date ?? "").slice(0, 4),
  poster_path: item.poster_path,
});

export const searchTmdbTitle = async (
  title: string,
  year: number,
  mediaType: "movie" | "tv"
): Promise<TmdbMovie | null> => {
  const yearParam = mediaType === "movie" ? "year" : "first_air_date_year";
  const data = await tmdbFetch<{ results: RawTmdbResult[] }>(`/search/${mediaType}`, {
    query: title,
    [yearParam]: String(year),
  });
  const best = data.results[0];
  return best ? normalizeResult(best, mediaType) : null;
};

// Igual a searchTmdbTitle, mas sem exigir ano — usado quando só se tem o
// nome do filme (ex.: título capturado de fora, do ingresso.com, que não
// vem com ano nenhum). Sem o filtro de ano o /search/movie do TMDb ordena
// por popularidade, que na prática já favorece o lançamento certo/atual
// entre homônimos.
export const searchMovieByTitle = async (title: string): Promise<TmdbMovie | null> => {
  const data = await tmdbFetch<{ results: RawTmdbResult[] }>("/search/movie", { query: title });
  const best = data.results[0];
  return best ? normalizeResult(best, "movie") : null;
};

// Busca filme E série juntos (igual `searchMovies` de
// home/dashboard/functions.ts, reaproveitada pelo @/components/searchModal)
// — mas com `year` já resolvido (`TmdbMovie`, não `DashboardMovie`), pro
// campo "ano" exigido por `TimelineMovie` (service/TimelineSettings.ts) na
// hora de adicionar um resultado de busca numa timeline manual
// (@/components/addToTimelineButton).
interface RawTmdbMultiResult extends RawTmdbResult {
  media_type?: string;
}

export const searchTmdbMulti = async (query: string, limit: number): Promise<TmdbMovie[]> => {
  const data = await tmdbFetch<{ results: RawTmdbMultiResult[] }>("/search/multi", { query });
  return data.results
    .filter((r): r is RawTmdbMultiResult & { media_type: "movie" | "tv" } => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, limit)
    .map((r) => normalizeResult(r, r.media_type));
};

// --- Resolução por id já conhecido -------------------------------------------
// Diferente de searchTmdbTitle (busca por nome quando só se sabe o
// título) — aqui já se sabe o id de verdade (ex.: a chave de "já vi",
// service/WatchedSettings.ts, é `${mediaType}-${id}`) e só falta
// título/pôster pra exibir. Usado por "Últimos vistos"
// (home/dashboard/functions.ts) pra listar sem duplicar esse dado no
// Firestore.
export interface ResolvedTitle {
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  voteAverage: number;
}

// Título/pôster de um id NÃO muda de uma visita pra outra — memo em memória
// (vale a sessão do app) evita re-resolver os mesmos ids toda vez que
// "Últimos vistos"/"Seu rank" remontam; guarda a Promise, então chamadas
// simultâneas pro mesmo id também viram uma só.
const titleMemo = new Map<string, Promise<ResolvedTitle | null>>();

export const fetchTitleById = (mediaType: "movie" | "tv", id: number): Promise<ResolvedTitle | null> => {
  const memoKey = `${mediaType}-${id}`;
  const existing = titleMemo.get(memoKey);
  if (existing) return existing;

  const request = (async (): Promise<ResolvedTitle | null> => {
    try {
      const data = await tmdbFetch<{
        title?: string;
        name?: string;
        poster_path: string | null;
        backdrop_path: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
      }>(`/${mediaType}/${id}`);
      return {
        title: data.title ?? data.name ?? "Sem título",
        posterPath: data.poster_path,
        backdropPath: data.backdrop_path,
        year: (data.release_date ?? data.first_air_date ?? "").slice(0, 4),
        voteAverage: data.vote_average ?? 0,
      };
    } catch (err) {
      console.error(`Erro ao resolver ${mediaType}/${id} no TMDb:`, err);
      titleMemo.delete(memoKey); // falha não fica em cache — próxima tentativa refaz
      return null;
    }
  })();

  titleMemo.set(memoKey, request);
  return request;
};
