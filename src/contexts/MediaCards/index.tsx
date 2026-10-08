import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/service/FirebaseSettings";
import { fetchTrailerKey } from "@/service/TMDbSettings";
import MovieDetail from "@/components/organisms/MovieDetail";
import SeriesDetail from "@/components/organisms/SeriesDetail";
import TrailerModal from "@/components/atoms/TrailerModal";
import { useConfirm } from "@/contexts/Confirm";
import { movieKey } from "@/actions/helpers/timelines";
import {
  completeFollowed,
  fetchFollowedSeries,
  fetchSeriesWithEpisodes,
  followSeries,
  followedSeriesProgress,
  setEpisodesWatched,
  unfollowSeries,
  unwatchedBefore,
  withEpisodes,
  type EpisodeRef,
  type FollowedSeries,
} from "@/actions/helpers/followed";
import { completeWatched, fetchWatched, saveRating, saveWatched, type WatchedTitle } from "@/actions/helpers/watched";
import type { MediaItem } from "@/types/media";

// O que o usuário já guardou de um título (visto, avaliado ou seguido): o suficiente para montar o card sem consultar o TMDb.
type StoredTitle = Pick<WatchedTitle, "title" | "year" | "posterPath" | "backdropPath" | "available" | "category">;

interface MediaCardsApi {
  uid: string | null;
  watchedMap: Map<string, number>; // filmes vistos: chave -> quando
  ratings: Map<string, number>;
  titles: Map<string, StoredTitle>; // dados de card de tudo que é do usuário
  followed: Map<number, FollowedSeries>;
  followedList: FollowedSeries[];
  checkedMap: Map<string, number>;
  pendingIds: Set<number>;
  watchedRevision: number;
  watchedLoading: boolean; // o que o usuário viu/avaliou ainda está sendo lido do Firebase
  followedLoading: boolean; // as séries/animes que ele segue ainda estão sendo lidas do Firebase
  isChecked: (item: Pick<MediaItem, "id" | "mediaType">) => boolean;
  toggleChecked: (item: MediaItem) => void;
  rate: (item: MediaItem, rating: number | null) => void;
  playTrailer: (item: { id: number; mediaType: "movie" | "tv"; title: string }) => void;
  openDetail: (item: { id: number; mediaType: "movie" | "tv" }) => void;
}

const MediaCardsContext = createContext<MediaCardsApi | null>(null);

// Estado global dos cards: o que o usuário viu, avaliou e segue, as ações sobre os cards e os modais que eles abrem.
// usado em: animes/myanimes, animes/mynotesrank, awards/dashboard, franchises/dashboard, helpers/aisuggestion, helpers/rank, …
export const useMediaCards = (): MediaCardsApi => {
  const ctx = useContext(MediaCardsContext);
  if (!ctx) throw new Error("useMediaCards precisa estar dentro de <MediaCardsProvider>");
  return ctx;
};

const definedOnly = <T extends object>(obj: T): Partial<T> => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;

// Carrega uma vez por sessão (fica no PrivateLayout). As ações são otimistas: a tela muda na hora e volta atrás se o Firestore falhar.
const MediaCardsProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const uid = auth.currentUser?.uid ?? null;

  const [records, setRecords] = useState<WatchedTitle[]>([]);
  const [followedList, setFollowedList] = useState<FollowedSeries[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [watchedRevision, setWatchedRevision] = useState(0);
  const [watchedLoading, setWatchedLoading] = useState(uid !== null);
  const [followedLoading, setFollowedLoading] = useState(uid !== null);

  const [trailer, setTrailer] = useState<{ title: string; youtubeKey: string | null; loading: boolean } | null>(null);
  const [detail, setDetail] = useState<{ id: number; mediaType: "movie" | "tv" } | null>(null);
  const [seriesDetailId, setSeriesDetailId] = useState<number | null>(null);

  const loadFollowed = useCallback(() => {
    if (!uid) return;
    fetchFollowedSeries(uid)
      .then(async (list) => {
        setFollowedList(list);
        setFollowedLoading(false); // a lista já pode ser mostrada; completar os registros antigos segue em segundo plano
        const completed = await completeFollowed(uid, list);
        if (completed.length > 0) setFollowedList((prev) => prev.map((series) => completed.find((c) => c.id === series.id) ?? series));
      })
      .catch((err) => console.error("Erro ao buscar séries/animes seguidos:", err))
      .finally(() => setFollowedLoading(false));
  }, [uid]);

  // 1. busca o que o usuário já viu/avaliou/segue; 2. completa em segundo plano os registros antigos que ainda não têm dados de card
  useEffect(() => {
    if (!uid) return;
    fetchWatched(uid)
      .then(async (list) => {
        setRecords(list);
        setWatchedLoading(false); // a lista já pode ser mostrada; completar os registros antigos segue em segundo plano
        const completed = await completeWatched(uid, list);
        if (completed.length > 0) setRecords((prev) => prev.map((record) => completed.find((c) => c.key === record.key) ?? record));
      })
      .catch((err) => console.error("Erro ao buscar filmes vistos:", err))
      .finally(() => setWatchedLoading(false));
    loadFollowed();
  }, [uid, loadFollowed]);

  const watchedMap = useMemo(() => new Map(records.flatMap((r): [string, number][] => (r.watchedAt !== undefined && r.mediaType === "movie" ? [[r.key, r.watchedAt]] : []))), [records]);
  const ratings = useMemo(() => new Map(records.flatMap((r): [string, number][] => (r.rating !== undefined ? [[r.key, r.rating]] : []))), [records]);
  const followed = useMemo(() => new Map(followedList.map((s) => [s.id, s])), [followedList]);

  const titles = useMemo(() => {
    const map = new Map<string, StoredTitle>(records.filter((r) => r.title).map((r) => [r.key, r]));
    // o que o usuário segue manda na categoria (série ou anime) do título
    for (const s of followedList) map.set(movieKey("tv", s.id), { ...(map.get(movieKey("tv", s.id)) ?? s), category: s.category });
    return map;
  }, [records, followedList]);

  // Filmes vistos + séries seguidas.
  const checkedMap = useMemo(() => {
    const merged = new Map(watchedMap);
    for (const series of followedList) merged.set(movieKey("tv", series.id), series.addedAt);
    return merged;
  }, [watchedMap, followedList]);

  // Registro do título com os dados do card que chegaram agora por cima do que já estava guardado.
  const recordOf = (item: MediaItem, extra: Partial<WatchedTitle>): WatchedTitle => {
    const key = movieKey(item.mediaType!, item.id!);
    const stored = records.find((r) => r.key === key);
    return { ...stored, ...definedOnly({ title: item.title, year: item.year, posterPath: item.posterPath, backdropPath: item.backdropPath, available: item.available }), key, id: item.id!, mediaType: item.mediaType!, ...extra } as WatchedTitle;
  };

  const toggleWatchedMovie = async (item: MediaItem) => {
    if (!uid) return;
    const key = movieKey("movie", item.id!);
    const nextWatched = !watchedMap.has(key);

    const previous = records;
    setRecords(nextWatched ? [...records.filter((r) => r.key !== key), recordOf(item, { watchedAt: Date.now() })] : records.filter((r) => r.key !== key));

    try {
      await saveWatched(uid, { ...titles.get(key), ...definedOnly(item) } as MediaItem, nextWatched);
      setWatchedRevision((n) => n + 1);
    } catch (err) {
      console.error("Erro ao marcar filme como visto:", err);
      setRecords(previous);
    }
  };

  const toggleFollow = async (item: MediaItem) => {
    if (!uid || item.id === undefined || pendingIds.has(item.id)) return;
    const id = item.id;
    const current = followed.get(id);

    if (current && followedSeriesProgress(current).watched > 0) {
      const ok = await confirm({
        title: t("seriesPage.confirmUnfollowTitle"),
        message: t("seriesPage.confirmUnfollow", { title: current.title }),
        confirmLabel: t("seriesPage.confirmUnfollowYes"),
        danger: true,
      });
      if (!ok) return;
    }

    setPendingIds((prev) => new Set(prev).add(id));
    try {
      if (current) {
        await unfollowSeries(uid, id);
        setFollowedList((prev) => prev.filter((s) => s.id !== id));
        setSeriesDetailId((open) => (open === id ? null : open));
      } else {
        const { status, isAnime, seasons } = await fetchSeriesWithEpisodes(id);
        await followSeries(uid, {
          id,
          title: item.title,
          posterPath: item.posterPath ?? null,
          backdropPath: item.backdropPath,
          year: item.year,
          available: item.available,
          status,
          category: item.category ?? (isAnime ? "animes" : "series"),
          seasons,
        });
        loadFollowed();
      }
    } catch (err) {
      console.error("Erro ao seguir/deixar de seguir série:", err);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleChecked = (item: MediaItem) => {
    if (item.id === undefined || !item.mediaType) return;
    if (item.mediaType === "tv") toggleFollow(item);
    else toggleWatchedMovie(item);
  };

  const isChecked = (item: Pick<MediaItem, "id" | "mediaType">) => {
    if (item.id === undefined || !item.mediaType) return false;
    return item.mediaType === "tv" ? followed.has(item.id) : watchedMap.has(movieKey("movie", item.id));
  };

  const rate = async (item: MediaItem, rating: number | null) => {
    if (!uid || item.id === undefined || !item.mediaType) return;
    const key = movieKey(item.mediaType, item.id);
    const stored = records.find((r) => r.key === key);

    const previous = records;
    const rest = records.filter((r) => r.key !== key);
    setRecords(rating === null && stored?.watchedAt === undefined ? rest : [...rest, { ...recordOf(item, {}), rating: rating ?? undefined }]);

    try {
      await saveRating(uid, { ...titles.get(key), ...definedOnly(item) } as MediaItem, rating, stored?.watchedAt !== undefined);
    } catch (err) {
      console.error("Erro ao salvar a nota:", err);
      setRecords(previous);
    }
  };

  const playTrailer = (item: { id: number; mediaType: "movie" | "tv"; title: string }) => {
    setTrailer({ title: item.title, youtubeKey: null, loading: true });
    fetchTrailerKey(item.mediaType, item.id).then((youtubeKey) =>
      setTrailer((current) => (current && current.title === item.title ? { ...current, youtubeKey, loading: false } : current))
    );
  };

  const openDetail = (item: { id: number; mediaType: "movie" | "tv" }) => {
    if (item.mediaType === "tv" && followed.has(item.id)) setSeriesDetailId(item.id);
    else setDetail(item);
  };

  const patchFollowed = (series: FollowedSeries) => setFollowedList((prev) => prev.map((s) => (s.id === series.id ? series : s)));

  const askMarkPrevious = (count: number) =>
    confirm({
      title: t("seriesPage.confirmMarkPreviousTitle"),
      message: t("seriesPage.confirmMarkPrevious", { count }),
      confirmLabel: t("seriesPage.confirmMarkPreviousYes"),
      cancelLabel: t("seriesPage.confirmMarkPreviousNo"),
    });

  // Marca/desmarca episódios (atualiza a tela na hora e volta atrás se o Firestore falhar).
  // Ao marcar, oferece marcar também os episódios anteriores que ainda não foram vistos.
  const markEpisodes = async (series: FollowedSeries, requested: EpisodeRef[], watched: boolean, fromSeason: number, fromEpisode: number) => {
    if (!uid) return;

    let toggled = requested;
    if (watched) {
      const previous = unwatchedBefore(series, fromSeason, fromEpisode);
      if (previous.length > 0 && (await askMarkPrevious(previous.length))) toggled = [...previous, ...requested];
    }

    patchFollowed(withEpisodes(series, toggled, watched));
    try {
      await setEpisodesWatched(uid, series.id, toggled, watched);
    } catch (err) {
      console.error("Erro ao marcar episódios:", err);
      patchFollowed(series);
    }
  };

  const toggleEpisode = (series: FollowedSeries, season: number, episode: number) =>
    markEpisodes(series, [{ season, episode }], !series.seasons[String(season)].episodes[String(episode)].watched, season, episode);

  const toggleSeason = (series: FollowedSeries, season: number, episodes: number[], watched: boolean) =>
    markEpisodes(series, episodes.map((episode) => ({ season, episode })), watched, season, 0);

  const api: MediaCardsApi = {
    uid,
    watchedMap,
    ratings,
    titles,
    followed,
    followedList,
    checkedMap,
    pendingIds,
    watchedRevision,
    watchedLoading,
    followedLoading,
    isChecked,
    toggleChecked,
    rate,
    playTrailer,
    openDetail,
  };

  const seriesDetail = seriesDetailId !== null ? followed.get(seriesDetailId) ?? null : null;

  return (
    <MediaCardsContext.Provider value={api}>
      {children}

      {trailer && <TrailerModal title={trailer.title} youtubeKey={trailer.youtubeKey} loading={trailer.loading} onClose={() => setTrailer(null)} />}
      {detail && <MovieDetail id={detail.id} mediaType={detail.mediaType} onClose={() => setDetail(null)} />}
      {seriesDetail && (
        <SeriesDetail series={seriesDetail} uid={uid} onClose={() => setSeriesDetailId(null)} onToggleEpisode={toggleEpisode} onToggleSeason={toggleSeason} />
      )}
    </MediaCardsContext.Provider>
  );
};

export default MediaCardsProvider;
