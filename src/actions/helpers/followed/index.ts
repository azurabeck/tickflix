import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/service/FirebaseSettings";
import { tmdbFetch } from "@/service/TMDbSettings";
import { resolveCardData } from "@/actions/helpers/carddata";

// Ciclo "estou assistindo" (séries e animes): seguir -> marcar episódios -> acompanhar o progresso.
// usado no MediaCardsProvider (check dos cards, detalhe da série) e nas páginas Séries e Animes.

export interface FollowedEpisode {
  name: string;
  watched: boolean;
  airDate: string;
}

export interface FollowedSeason {
  name: string;
  episodes: Record<string, FollowedEpisode>;
}

export type FollowedCategory = "series" | "animes";

export interface FollowedSeries {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  year?: string;
  available?: boolean;
  availableCheckedAt?: number;
  addedAt: number;
  totalSeasons: number;
  seasons: Record<string, FollowedSeason>;
  status: string;
  category: FollowedCategory;
}

export interface EpisodeRef {
  season: number;
  episode: number;
}

// ---------- 1. TMDb: temporadas e episódios de uma série ----------

interface RawEpisode {
  episode_number: number;
  name: string;
  air_date: string | null;
  overview?: string;
}

// Episódios de uma temporada, direto do TMDb.
// usado em: helpers/seriesdetail
export const fetchSeasonEpisodes = async (seriesId: number, seasonNumber: number): Promise<RawEpisode[]> =>
  (await tmdbFetch<{ episodes: RawEpisode[] }>(`/tv/${seriesId}/season/${seasonNumber}`)).episodes;

// Busca todas as temporadas e episódios (nenhum visto ainda) e diz se é anime
// (mesma definição do resto do app: gênero Animação + produzido/falado em japonês).
// usado em: MediaCardsProvider
export const fetchSeriesWithEpisodes = async (seriesId: number) => {
  const data = await tmdbFetch<{
    status: string;
    seasons: { season_number: number; name: string }[];
    genres?: { id: number }[];
    original_language?: string;
    origin_country?: string[];
  }>(`/tv/${seriesId}`);

  const seasonList = data.seasons.filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number);
  const episodesPerSeason = await Promise.all(seasonList.map((s) => fetchSeasonEpisodes(seriesId, s.season_number)));

  const seasons: Record<string, FollowedSeason> = {};
  seasonList.forEach((season, index) => {
    const episodes: Record<string, FollowedEpisode> = {};
    for (const ep of episodesPerSeason[index]) episodes[String(ep.episode_number)] = { name: ep.name, watched: false, airDate: ep.air_date ?? "" };
    seasons[String(season.season_number)] = { name: season.name, episodes };
  });

  const isAnime = (data.genres ?? []).some((g) => g.id === 16) && (data.original_language === "ja" || (data.origin_country ?? []).includes("JP"));
  return { status: data.status, isAnime, seasons };
};

// ---------- 2. Firestore: séries seguidas ----------

const followingCollection = (uid: string) => collection(db, "users", uid, "following");

// Lê no Firestore as séries/animes que o usuário segue (as mais recentes primeiro).
// usado em: MediaCardsProvider
export const fetchFollowedSeries = async (uid: string): Promise<FollowedSeries[]> => {
  const snapshot = await getDocs(followingCollection(uid));
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as FollowedSeries;
      return { ...data, category: data.category ?? "series" };
    })
    .sort((a, b) => b.addedAt - a.addedAt);
};

// Começa a seguir uma série/anime (ignora se já seguia).
// usado em: MediaCardsProvider
export const followSeries = async (
  uid: string,
  series: Pick<FollowedSeries, "id" | "title" | "posterPath" | "backdropPath" | "year" | "available" | "availableCheckedAt" | "status" | "category" | "seasons">
): Promise<void> => {
  const ref = doc(followingCollection(uid), String(series.id));
  if ((await getDoc(ref)).exists()) return;
  const data = { ...series, availableCheckedAt: series.available !== undefined ? Date.now() : undefined, addedAt: Date.now(), totalSeasons: Object.keys(series.seasons).length };
  // o Firestore não aceita campos `undefined`
  await setDoc(ref, Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)));
};

// Completa em segundo plano as séries seguidas que precisam (antigas, ou "indisponíveis" há mais de uma semana): consulta rápida no TMDb
// e já grava no Firebase. As mais recentes primeiro.
// usado em: MediaCardsProvider
export const completeFollowed = async (uid: string, list: FollowedSeries[]): Promise<FollowedSeries[]> => {
  const entries = list.map((s) => ({ ...s, key: `tv-${s.id}`, mediaType: "tv" as const }));
  const resolved = await resolveCardData(entries);

  return Promise.all(
    list.flatMap((series) => {
      const resolvedData = resolved.get(`tv-${series.id}`);
      if (!resolvedData) return [];
      const { category: _category, ...data } = resolvedData; // a categoria da série seguida já foi escolhida ao seguir: a consulta do TMDb não troca
      return [updateDoc(doc(followingCollection(uid), String(series.id)), { ...data }).then(() => ({ ...series, ...data }))];
    })
  );
};

// Deixa de seguir e apaga o progresso.
// usado em: MediaCardsProvider
export const unfollowSeries = (uid: string, seriesId: number): Promise<void> => deleteDoc(doc(followingCollection(uid), String(seriesId)));

// Um episódio, uma temporada inteira ou vários episódios de temporadas diferentes: tudo é uma lista de episódios.
// usado em: MediaCardsProvider
export const setEpisodesWatched = (uid: string, seriesId: number, episodes: EpisodeRef[], watched: boolean): Promise<void> => {
  const updates: Record<string, boolean> = {};
  for (const { season, episode } of episodes) updates[`seasons.${season}.episodes.${episode}.watched`] = watched;
  return updateDoc(doc(followingCollection(uid), String(seriesId)), updates);
};

// ---------- 3. Regras de episódios ----------

// Episódios vistos e total de uma série seguida.
// usado em: MediaCard, SeriesDetail, MediaCardsProvider
export const followedSeriesProgress = (series: FollowedSeries): { watched: number; total: number } => {
  const episodes = Object.values(series.seasons).flatMap((season) => Object.values(season.episodes));
  return { watched: episodes.filter((e) => e.watched).length, total: episodes.length };
};

export interface EpisodeAiringInfo {
  aired: boolean;
  label: string;
}

// Diz se o episódio já foi ao ar e, se não, o texto de estreia.
// usado em: helpers/progress, helpers/seriesdetail, SeasonItem
export const episodeAiringInfo = (episode: FollowedEpisode, seriesStatus: string): EpisodeAiringInfo => {
  const today = new Date().toISOString().slice(0, 10);

  if (episode.airDate && episode.airDate <= today) return { aired: true, label: "" };
  if (!episode.airDate) return { aired: false, label: seriesStatus === "Canceled" ? "Cancelado" : "Aguardando data" };
  const [year, month, day] = episode.airDate.split("-");
  return { aired: false, label: `Estreia em ${day}/${month}/${year}` };
};

// Episódios já exibidos e ainda não vistos antes de (season, beforeEpisode): base do "marcar os anteriores também?".
// usado em: MediaCardsProvider
export const unwatchedBefore = (series: FollowedSeries, season: number, beforeEpisode: number): EpisodeRef[] => {
  const previous: EpisodeRef[] = [];
  for (const [seasonKey, seasonData] of Object.entries(series.seasons)) {
    const seasonNumber = Number(seasonKey);
    if (seasonNumber > season) continue;
    for (const [episodeKey, ep] of Object.entries(seasonData.episodes)) {
      const episodeNumber = Number(episodeKey);
      if (seasonNumber === season && episodeNumber >= beforeEpisode) continue;
      if (!ep.watched && episodeAiringInfo(ep, series.status).aired) previous.push({ season: seasonNumber, episode: episodeNumber });
    }
  }
  return previous;
};

// Cópia imutável da série com os episódios informados marcados como vistos/não vistos (atualização otimista da tela).
// usado em: MediaCardsProvider
export const withEpisodes = (series: FollowedSeries, toggled: EpisodeRef[], watched: boolean): FollowedSeries => {
  const seasons = { ...series.seasons };
  for (const { season, episode } of toggled) {
    const current = seasons[String(season)];
    seasons[String(season)] = { ...current, episodes: { ...current.episodes, [String(episode)]: { ...current.episodes[String(episode)], watched } } };
  }
  return { ...series, seasons };
};
