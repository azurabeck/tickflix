// src/service/FollowingSettings.ts
// "Seguir uma série/anime" (páginas Séries e Animes) — diferente de "já
// vi" (estado GLOBAL por filme/série INTEIRA, service/WatchedSettings.ts),
// aqui o usuário ADICIONA (segue) um título pra acompanhar episódio por
// episódio. Collection renomeada de "series" pra "following" — pedido
// explícito da Rebecca, pensando à frente: essa collection é só o
// registro cru de progresso por título (nome, temporadas, episódio a
// episódio com tag de visto); `service/TimelineSettings.ts` fica livre
// pra AGRUPAR títulos seguidos numa timeline nomeada, categoria
// "series"/"animes" — sem misturar os dois conceitos no mesmo dado.
//
// UMA collection só pra série E anime — não tem diferença nenhuma na
// FORMA do dado (mesmo esquema temporada/episódio); o que diferencia é
// só `category`, decidido por QUAL PÁGINA o usuário clicou "seguir"
// (mesmo raciocínio de `Timeline.types`, service/TimelineSettings.ts —
// não é inspeção de gênero/país no TMDb). Cada página filtra a lista pela
// própria categoria: "Minhas séries" mostra `category === "series"`,
// "Meus animes" mostra `category === "animes"`.
//
// Uma fonte de verdade por usuário: users/{uid}/following/{seriesId}
// (chave = id da série no TMDb, como string). Ao seguir, grava a série
// JÁ COM todos os episódios de todas as temporadas (resolvidos no TMDb
// na hora, ver fetchSeriesWithEpisodes em
// pages/private/series/functions.ts) — cada episódio com a própria tag
// `watched`, não mais um array separado de chaves "vistas" (primeira
// versão dessa collection, descontinuada).
//
// Temporada e episódio são MAPAS (chave = número, como string —
// Firestore só aceita chave de mapa como string) em vez de array, de
// propósito: permite marcar um episódio como visto com um update
// ATÔMICO e direcionado (`seasons.{temporada}.episodes.{episódio}.watched`,
// dot-path), sem precisar ler o doc inteiro pra reescrever um array toda
// vez que um episódio é marcado.
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./FirebaseSettings";

export interface FollowedEpisode {
  name: string;
  watched: boolean;
  // "" quando o TMDb ainda não agendou uma data — usado por
  // `episodeAiringInfo` abaixo pra decidir o que mostrar no lugar do
  // checkbox (data futura, "Aguardando data" ou "Cancelado").
  airDate: string;
}

export interface FollowedSeason {
  name: string;
  episodes: Record<string, FollowedEpisode>; // chave = número do episódio
}

// "series" (seguido pela página Séries) ou "animes" (seguido pela
// página Animes) — igual a `ContentType` (service/TimelineSettings.ts)
// mas sem "filmes", que não se aplica aqui (following é só título
// episódico, filme não tem temporada).
export type FollowedCategory = "series" | "animes";

export interface FollowedSeries {
  id: number;
  title: string;
  posterPath: string | null;
  addedAt: number;
  totalSeasons: number;
  seasons: Record<string, FollowedSeason>; // chave = número da temporada
  // Status da série no TMDb no momento de seguir ("Returning Series",
  // "Ended", "Canceled", "In Production", "Planned", "Pilot") — não
  // atualizado depois (não há por que reconsultar toda vez só por isso);
  // usado só pra decidir a legenda de episódio sem data agendada, ver
  // `episodeAiringInfo`. "" em doc antigo, gravado antes desse campo
  // existir — tratado como "não cancelada" (fallback "Aguardando data").
  status: string;
  category: FollowedCategory;
}

const followingCollection = (uid: string) => collection(db, "users", uid, "following");

// Doc gravado antes de `category` existir (só a página Séries existia
// ainda) não tem esse campo — tratado como "series" na leitura, mesmo
// raciocínio do backfill de `Timeline.types` em
// service/TimelineSettings.ts.
export const fetchFollowedSeries = async (uid: string): Promise<FollowedSeries[]> => {
  const snapshot = await getDocs(followingCollection(uid));
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as FollowedSeries;
      return { ...data, category: data.category ?? "series" };
    })
    .sort((a, b) => b.addedAt - a.addedAt);
};

// Não sobrescreve progresso já existente se "seguir" for chamado de novo
// pra um título já seguido (ex.: duplo clique) — só grava se o doc ainda
// não existir. Título já seguido por UMA página (ex.: anime seguido pela
// página Animes) e "adicionado" de novo pela OUTRA (ex.: achado numa
// busca da página Séries) fica preso na categoria original — limitação
// conhecida, ver documents.md de pages/private/anime.
export const followSeries = async (
  uid: string,
  series: {
    id: number;
    title: string;
    posterPath: string | null;
    status: string;
    category: FollowedCategory;
    seasons: Record<string, FollowedSeason>;
  }
): Promise<void> => {
  const ref = doc(followingCollection(uid), String(series.id));
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  const data: FollowedSeries = { ...series, addedAt: Date.now(), totalSeasons: Object.keys(series.seasons).length };
  await setDoc(ref, data);
};

// Deixa de seguir — apaga o doc inteiro, junto some o progresso de
// episódios (não tem como recuperar depois; quem chama pede confirmação
// antes quando é uma remoção deliberada, ver pages/private/series/index.tsx).
export const unfollowSeries = (uid: string, seriesId: number): Promise<void> =>
  deleteDoc(doc(followingCollection(uid), String(seriesId)));

export const setEpisodeWatched = (uid: string, seriesId: number, season: number, episode: number, watched: boolean): Promise<void> =>
  updateDoc(doc(followingCollection(uid), String(seriesId)), {
    [`seasons.${season}.episodes.${episode}.watched`]: watched,
  });

// Marca/desmarca VÁRIOS episódios de uma temporada de uma vez ("marcar
// temporada inteira", SeriesDetail.tsx) — um `updateDoc` SÓ, com um
// dot-path por episódio, em vez de um `setEpisodeWatched` por episódio
// num loop. Bug real, visto ao vivo: chamar `setEpisodeWatched` várias
// vezes seguidas num loop síncrono, cada chamada recebendo o MESMO
// `FollowedSeries` (stale, de antes do loop começar) pra calcular o
// próximo estado local, fazia cada `setState` otimista subsequente
// SOBRESCREVER o anterior (cada um só sabia marcar o SEU episódio sobre
// a base antiga) — de 9 episódios marcados, só o último "sobrevivia" no
// estado local. Um update/set só, com todos os episódios já resolvidos,
// evita o problema de raiz.
export const setSeasonWatched = (uid: string, seriesId: number, season: number, episodes: number[], watched: boolean): Promise<void> => {
  const updates: Record<string, boolean> = {};
  for (const episode of episodes) {
    updates[`seasons.${season}.episodes.${episode}.watched`] = watched;
  }
  return updateDoc(doc(followingCollection(uid), String(seriesId)), updates);
};

// Usado pela grade "Minhas séries" (barra de progresso do card) e por
// SeriesDetail (header do dialog) — soma episódios de todas as
// temporadas, não só a temporada aberta no momento.
export const followedSeriesProgress = (series: FollowedSeries): { watched: number; total: number } => {
  let watched = 0;
  let total = 0;
  for (const season of Object.values(series.seasons)) {
    for (const episode of Object.values(season.episodes)) {
      total++;
      if (episode.watched) watched++;
    }
  }
  return { watched, total };
};

// --- Episódio ainda não lançado (SeriesDetail.tsx) --------------------------
// Pedido explícito da Rebecca: "capítulos que não foram lançados aí, pode
// estar com mais opacity e a data que vai ser lançado... ou então algo
// como 'aguardando data' ou 'cancelado'". Três casos:
// 1) já foi ao ar (tem airDate <= hoje) → aired: true, pode marcar visto.
// 2) tem airDate no futuro → mostra a data formatada em vez do checkbox.
// 3) sem airDate nenhuma (TMDb ainda não agendou) → "Cancelado" se a
//    série inteira já está cancelada, senão "Aguardando data".
export interface EpisodeAiringInfo {
  aired: boolean;
  label: string; // só relevante quando aired é false
}

const formatBrDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `Estreia em ${day}/${month}/${year}`;
};

export const episodeAiringInfo = (episode: FollowedEpisode, seriesStatus: string): EpisodeAiringInfo => {
  const today = new Date().toISOString().slice(0, 10);

  if (episode.airDate && episode.airDate <= today) return { aired: true, label: "" };
  if (!episode.airDate) return { aired: false, label: seriesStatus === "Canceled" ? "Cancelado" : "Aguardando data" };
  return { aired: false, label: formatBrDate(episode.airDate) };
};
