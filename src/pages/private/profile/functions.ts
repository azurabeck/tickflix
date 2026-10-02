// src/pages/private/profile/functions.ts
// Pedido explícito da Rebecca: "em meu perfil segue o padrão do outro
// projeto [mailbook/livro-app]... trocar o nome, link da imagem,
// categorias preferidas de filmes e séries e ai pode colocar quantidade
// de filmes vistos, quantidade de séries vistas, quantidade de [animes]
// vistas". Mesma estrutura de lá (ver ProfilePage do livro-app):
// identidade editável (nome + avatar por LINK, sem upload próprio) +
// preferências (gêneros, aqui localStorage via
// service/UserPreferencesSettings.ts) + estatísticas (lá eram palavras/
// páginas escritas por projeto; aqui são títulos marcados "já vi", por
// categoria).
import { updateProfile, type User } from "firebase/auth";
import { tmdbFetch } from "@/service/TMDbSettings";
import { fetchWatchedMap } from "@/service/WatchedSettings";

export const isNameValid = (name: string): boolean => name.trim().length > 0;

// `updateProfile` só aceita os dois campos (displayName/photoURL) — os
// dois juntos numa chamada só (editar os dois ao mesmo tempo não deveria
// custar duas escritas). Campo de avatar vazio manda `null` (Firebase
// aceita, volta a mostrar a inicial do nome) — mesmo comportamento do
// mailbook ("avatarUrl.trim() || null").
export const saveProfile = (user: User, name: string, avatarUrl: string): Promise<void> =>
  updateProfile(user, { displayName: name.trim(), photoURL: avatarUrl.trim() || null });

// `metadata.creationTime` do Firebase já vem como string de data por
// extenso (ex. "Tue, 01 Oct 2026 12:00:00 GMT") — só precisa virar Date
// pra formatar com `toLocaleDateString`.
export const formatMemberSince = (creationTime: string | undefined): string | null => {
  if (!creationTime) return null;
  const date = new Date(creationTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

// --- Gêneros preferidos -------------------------------------------------------
// Lista oficial de gêneros de filme do TMDb (ids reais, mesmos usados em
// qualquer busca/filtro do app) — pedido explícito: "categorias
// preferidas de filmes e séries". TMDb tem uma lista de gênero PRA FILME
// e outra PRA SÉRIE que quase coincidem (mesmos ids pros em comum); como
// isso aqui é só preferência exibida no perfil (nenhum filtro de busca
// lê isso ainda), uma lista única cobrindo os dois basta — evita pedir
// pro usuário escolher duas vezes a "mesma" coisa.
export const PREFERRED_GENRES = [
  "Ação",
  "Animação",
  "Aventura",
  "Comédia",
  "Crime",
  "Documentário",
  "Drama",
  "Faroeste",
  "Fantasia",
  "Ficção científica",
  "Guerra",
  "História",
  "Mistério",
  "Música",
  "Romance",
  "Terror",
  "Thriller",
] as const;

// --- Estatísticas de "já vi" ---------------------------------------------------
// Pedido explícito: "quantidade de filmes vistos, quantidade de séries
// vistas, quantidade de [animes] vistas". `watchedMap`
// (service/WatchedSettings.ts) só guarda a CHAVE `${mediaType}-${id}` —
// "movie" já resolve sozinho (sem ambiguidade), mas "tv" precisa de UMA
// chamada a mais por título (`/tv/{id}`) pra saber se é série OU anime
// (mesmo critério já usado em pages/private/anime/functions.ts: gênero
// Animação + idioma/país de origem japonês) — watchedMap não guarda
// gênero nenhum.
export interface WatchedStats {
  movies: number;
  series: number;
  animes: number;
}

interface RawTvGenreCheck {
  genre_ids?: number[]; // só vem assim quando resolvido via /search ou /discover — /tv/{id} usa "genres" (objetos)
  genres?: { id: number }[];
  original_language?: string;
  origin_country?: string[];
}

const ANIME_GENRE_ID = 16;

const isAnimeTv = (data: RawTvGenreCheck): boolean => {
  const genreIds = data.genres?.map((g) => g.id) ?? data.genre_ids ?? [];
  return genreIds.includes(ANIME_GENRE_ID) && (data.original_language === "ja" || (data.origin_country ?? []).includes("JP"));
};

export const fetchWatchedStats = async (uid: string): Promise<WatchedStats> => {
  const watchedMap = await fetchWatchedMap(uid);
  const movieIds: number[] = [];
  const tvIds: number[] = [];

  for (const key of watchedMap.keys()) {
    const [mediaType, idText] = key.split("-");
    const id = Number(idText);
    if (!Number.isFinite(id)) continue;
    if (mediaType === "movie") movieIds.push(id);
    else if (mediaType === "tv") tvIds.push(id);
  }

  // Em paralelo (o limitador de concorrência de service/TMDbSettings.ts
  // já evita estourar o rate limit do TMDb mesmo com muitos títulos) —
  // falha em resolver UM título não derruba a contagem dos outros, só
  // cai no fallback "série" (mais comum que anime, erro conservador).
  const tvResults = await Promise.allSettled(tvIds.map((id) => tmdbFetch<RawTvGenreCheck>(`/tv/${id}`)));

  let series = 0;
  let animes = 0;
  for (const result of tvResults) {
    if (result.status === "fulfilled" && isAnimeTv(result.value)) animes++;
    else series++;
  }

  return { movies: movieIds.length, series, animes };
};
