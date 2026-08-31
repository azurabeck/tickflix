// src/service/TMDbSettings.ts
// Client fino pro TMDb (The Movie Database) — usado em todo o app pra
// buscar filme/série. Usa o token v4 (Read Access Token, formato JWT —
// themoviedb.org/settings/api) via header `Authorization: Bearer`, não a
// api_key v3 antiga por query param. Mesma lógica do apiKey do Firebase:
// não é segredo de verdade pra esse uso de leitura pública, quem limita
// abuso é o próprio TMDb por rate limit — então chamamos direto do
// browser sem precisar de Cloud Function.

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
// Imagem maior — só pro fundo do modal de detalhes do filme/série
// (MovieDetail), onde um pôster em w342 ficaria borrado esticado full-width.
export const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
export const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";
// Logo de provedor de streaming ("onde assistir") — w92 é o menor
// tamanho oficial do TMDb pra isso, mais que suficiente pro ícone
// pequeno da lista de provedores.
export const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

// Exportado (não é segredo de verdade, ver comentário acima) — o prompt
// copiável do AddDataModal.tsx (página Oscar) precisa dele pra passar
// pra IA externa pesquisar no TMDb.
export const READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_API_KEY;

export const tmdbFetch = async <T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> => {
  if (!READ_ACCESS_TOKEN) {
    throw new Error("VITE_TMDB_API_KEY não configurada — ver .env.example.");
  }

  const query = new URLSearchParams({ language: "pt-BR", ...params });
  const response = await fetch(`${TMDB_BASE_URL}${path}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${READ_ACCESS_TOKEN}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.status_message;
    throw new Error(`TMDb respondeu ${response.status} em ${path}${detail ? `: ${detail}` : ""}`);
  }

  return response.json() as Promise<T>;
};

export const posterUrl = (path: string | null): string | null => (path ? `${TMDB_IMAGE_BASE}${path}` : null);

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

// --- Resolução por id já conhecido -------------------------------------------
// Diferente de searchTmdbTitle (busca por nome quando só se sabe o
// título) — aqui já se sabe o id de verdade (ex.: a chave de "já vi",
// service/WatchedSettings.ts, é `${mediaType}-${id}`) e só falta
// título/pôster pra exibir. Usado por "Últimos vistos"
// (home/dashboard/functions.ts) pra listar sem duplicar esse dado no
// Firestore.
export const fetchTitleById = async (mediaType: "movie" | "tv", id: number): Promise<{ title: string; posterPath: string | null } | null> => {
  try {
    const data = await tmdbFetch<{ title?: string; name?: string; poster_path: string | null }>(`/${mediaType}/${id}`);
    return { title: data.title ?? data.name ?? "Sem título", posterPath: data.poster_path };
  } catch (err) {
    console.error(`Erro ao resolver ${mediaType}/${id} no TMDb:`, err);
    return null;
  }
};
