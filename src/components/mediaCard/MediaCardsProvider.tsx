// src/components/mediaCard/MediaCardsProvider.tsx
// Estado e ações COMPARTILHADOS por todo card de filme/série/anime do app
// (montado UMA vez em PrivateLayout, então vale pra todas as páginas e não
// recarrega a cada troca de página):
//
//   - filmes assistidos + nota do usuário (users/{uid}/watched)
//   - séries/animes seguidos com progresso de episódio (users/{uid}/following)
//   - disponibilidade em streaming/aluguel (a claquete/tv do card movie)
//   - ações: check, nota, trailer, abrir detalhe, episódios/temporadas
//   - os modais que essas ações abrem: trailer, MovieDetail e SeriesDetail
//
// O check do card tem DOIS significados (ver MediaCard.tsx): em FILME é "já
// vi" (WatchedSettings); em SÉRIE/ANIME é "estou assistindo" — segue o
// título (FollowingSettings). `isChecked`/`toggleChecked` escondem isso de
// quem usa. A nota independe do check nas séries (setSeriesRating).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/service/FirebaseSettings";
import MovieDetail from "@/components/movieDetail";
import { fetchAvailabilityMap } from "@/components/movieDetail/functions";
import TrailerModal from "@/components/trailerModal";
import { movieKey } from "@/service/TimelineSettings";
import { fetchTitleById } from "@/service/TMDbSettings";
import {
  fetchFollowedSeries,
  followSeries,
  followedSeriesProgress,
  setEpisodeWatched,
  setSeasonWatched,
  unfollowSeries,
  type FollowedSeries,
} from "@/service/FollowingSettings";
import { fetchWatchedWithRatings, setRating, setSeriesRating, setWatched } from "@/service/WatchedSettings";
import { fetchTrailerKey, getRecentlyWatched, type DashboardMovie } from "@/pages/private/home/dashboard/functions";
import { fetchSeriesWithEpisodes } from "@/pages/private/series/functions";
import SeriesDetail from "@/pages/private/series/SeriesDetail";
import type { MediaItem } from "./types";

// O que basta pra agir sobre um título (o card passa o item inteiro, as
// linhas de rank só id/tipo/título).
export type MediaRef = Pick<MediaItem, "id" | "mediaType" | "title" | "posterPath" | "category">;

export interface MediaCardsApi {
  uid: string | null;
  // Filmes: já vi (chave `movie-{id}`).
  watchedMap: Map<string, number>;
  ratings: Map<string, number>;
  // Séries/animes seguidos, por id do TMDb.
  followed: Map<number, FollowedSeries>;
  followedList: FollowedSeries[];
  // "Marcados" de qualquer tipo numa chave só: filme visto + série/anime
  // seguido (chave `{mediaType}-{id}`) — é o que alimenta progresso de
  // timeline, ranks e IA.
  checkedMap: Map<string, number>;
  availabilityMap: Map<string, true>;
  // Ids de série em processo de seguir (resolvendo episódios no TMDb).
  pendingIds: Set<number>;
  // Muda a cada check de FILME.
  watchedRevision: number;
  // "Últimos vistos" da Home (8 filmes) — vive aqui, não na página, pra
  // sobreviver à troca de página: só refaz a busca quando um filme é
  // marcado/desmarcado (`watchedRevision`), nunca ao voltar pra Home.
  recentlyWatched: DashboardMovie[] | null;
  isChecked: (item: Pick<MediaItem, "id" | "mediaType">) => boolean;
  toggleChecked: (item: MediaRef) => void;
  rate: (key: string, rating: number | null) => void;
  playTrailer: (item: { id: number; mediaType: "movie" | "tv"; title: string }) => void;
  openDetail: (item: { id: number; mediaType: "movie" | "tv" }) => void;
  loadAvailability: (items: { id?: number; mediaType?: "movie" | "tv" }[]) => void;
}

const RECENT_LIMIT = 8;

const MediaCardsContext = createContext<MediaCardsApi | null>(null);

export const useMediaCards = (): MediaCardsApi => {
  const ctx = useContext(MediaCardsContext);
  if (!ctx) throw new Error("useMediaCards precisa estar dentro de <MediaCardsProvider>");
  return ctx;
};

const MediaCardsProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const uid = auth.currentUser?.uid ?? null;

  const [watchedMap, setWatchedMap] = useState<Map<string, number>>(new Map());
  const [ratings, setRatings] = useState<Map<string, number>>(new Map());
  const [followedList, setFollowedList] = useState<FollowedSeries[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, true>>(new Map());
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [watchedRevision, setWatchedRevision] = useState(0);
  const [recentlyWatched, setRecentlyWatched] = useState<DashboardMovie[] | null>(null);

  const [trailer, setTrailer] = useState<{ title: string; youtubeKey: string | null; loading: boolean } | null>(null);
  const [detail, setDetail] = useState<{ id: number; mediaType: "movie" | "tv" } | null>(null);
  const [seriesDetailId, setSeriesDetailId] = useState<number | null>(null);

  const loadFollowed = useCallback(() => {
    if (!uid) return;
    fetchFollowedSeries(uid)
      .then(setFollowedList)
      .catch((err) => console.error("Erro ao buscar séries/animes seguidos:", err));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    fetchWatchedWithRatings(uid)
      .then(({ watchedMap: watched, ratings: rated }) => {
        setWatchedMap(watched);
        setRatings(rated);
      })
      .catch((err) => console.error("Erro ao buscar filmes vistos:", err));
    loadFollowed();
  }, [uid, loadFollowed]);

  // Query própria (ordenada por watchedAt) + título/pôster no TMDb. Roda no
  // primeiro carregamento e depois só quando um filme é marcado/desmarcado.
  useEffect(() => {
    if (!uid) return;
    getRecentlyWatched(uid, RECENT_LIMIT)
      .then((movies) => {
        setRecentlyWatched(movies);
        loadAvailability(movies);
      })
      .catch((err) => console.error("Erro ao buscar últimos vistos:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, watchedRevision]);

  const followed = useMemo(() => new Map(followedList.map((s) => [s.id, s])), [followedList]);

  const checkedMap = useMemo(() => {
    const merged = new Map<string, number>();
    for (const [key, at] of watchedMap) if (key.startsWith("movie-")) merged.set(key, at);
    for (const series of followedList) merged.set(movieKey("tv", series.id), series.addedAt);
    return merged;
  }, [watchedMap, followedList]);

  // --- Disponibilidade: cada chave é buscada uma vez só --------------------
  const requestedAvailability = useRef(new Set<string>());
  const loadAvailability = useCallback((items: { id?: number; mediaType?: "movie" | "tv" }[]) => {
    const fresh = items.filter((item): item is { id: number; mediaType: "movie" | "tv" } => {
      if (item.id === undefined || item.mediaType === undefined) return false;
      const key = movieKey(item.mediaType, item.id);
      if (requestedAvailability.current.has(key)) return false;
      requestedAvailability.current.add(key);
      return true;
    });
    if (fresh.length === 0) return;

    fetchAvailabilityMap(fresh)
      .then((resolved) => setAvailabilityMap((prev) => new Map([...prev, ...resolved])))
      .catch((err) => {
        console.error("Erro ao buscar disponibilidade (streaming/aluguel):", err);
        for (const item of fresh) requestedAvailability.current.delete(movieKey(item.mediaType, item.id)); // tenta de novo depois
      });
  }, []);

  // --- Check: filme = já vi · série/anime = estou assistindo ----------------
  const toggleWatchedMovie = async (id: number) => {
    if (!uid) return;
    const key = movieKey("movie", id);
    const nextWatched = !watchedMap.has(key);

    const nextMap = new Map(watchedMap);
    if (nextWatched) nextMap.set(key, Date.now());
    else nextMap.delete(key);
    setWatchedMap(nextMap);

    // Desmarcar "já vi" apaga o doc inteiro (setWatched), nota junto.
    const previousRatings = ratings;
    if (!nextWatched && ratings.has(key)) {
      const nextRatings = new Map(ratings);
      nextRatings.delete(key);
      setRatings(nextRatings);
    }

    try {
      await setWatched(uid, key, nextWatched);
      setWatchedRevision((n) => n + 1);
    } catch (err) {
      console.error("Erro ao marcar filme como visto:", err);
      setWatchedMap(watchedMap); // desfaz
      setRatings(previousRatings);
    }
  };

  // Seguir exige resolver temporadas + TODOS os episódios no TMDb antes
  // (fetchSeriesWithEpisodes), então a série só aparece em "Minhas séries"
  // depois — o check fica ocupado até lá. Deixar de seguir perde o
  // progresso de episódios: confirma se houver algum.
  const toggleFollow = async (item: MediaRef) => {
    if (!uid || item.id === undefined || pendingIds.has(item.id)) return;
    const id = item.id;
    const current = followed.get(id);

    if (current && followedSeriesProgress(current).watched > 0) {
      if (!window.confirm(t("seriesPage.confirmUnfollow", { title: current.title }))) return;
    }

    setPendingIds((prev) => new Set(prev).add(id));
    try {
      if (current) {
        await unfollowSeries(uid, id);
        setFollowedList((prev) => prev.filter((s) => s.id !== id));
        setSeriesDetailId((open) => (open === id ? null : open));
      } else {
        // Linhas de rank só conhecem id/título: completa com o pôster do TMDb.
        const needsMeta = !item.title || item.posterPath === undefined;
        const [{ status, seasons }, meta] = await Promise.all([fetchSeriesWithEpisodes(id), needsMeta ? fetchTitleById("tv", id) : null]);
        await followSeries(uid, {
          id,
          title: item.title || meta?.title || "",
          posterPath: item.posterPath ?? meta?.posterPath ?? null,
          status,
          category: item.category ?? "series",
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

  const toggleChecked = (item: MediaRef) => {
    if (item.id === undefined || !item.mediaType) return;
    if (item.mediaType === "tv") toggleFollow(item);
    else toggleWatchedMovie(item.id);
  };

  const isChecked = (item: Pick<MediaItem, "id" | "mediaType">) => {
    if (item.id === undefined || !item.mediaType) return false;
    return item.mediaType === "tv" ? followed.has(item.id) : watchedMap.has(movieKey("movie", item.id));
  };

  // --- Nota (otimista) ------------------------------------------------------
  // Filme só avalia depois de visto (a nota mora no doc do "já vi"); série
  // pode a qualquer momento (setSeriesRating cria o doc só com a nota).
  const rate = async (key: string, rating: number | null) => {
    if (!uid) return;
    const previous = ratings;
    const next = new Map(ratings);
    if (rating === null) next.delete(key);
    else next.set(key, rating);
    setRatings(next);

    try {
      if (key.startsWith("tv-")) await setSeriesRating(uid, key, rating, watchedMap.has(key));
      else await setRating(uid, key, rating);
    } catch (err) {
      console.error("Erro ao salvar a nota:", err);
      setRatings(previous); // desfaz
    }
  };

  const playTrailer = (item: { id: number; mediaType: "movie" | "tv"; title: string }) => {
    setTrailer({ title: item.title, youtubeKey: null, loading: true });
    fetchTrailerKey(item.mediaType, item.id).then((youtubeKey) =>
      setTrailer((current) => (current && current.title === item.title ? { ...current, youtubeKey, loading: false } : current))
    );
  };

  // Série/anime já seguido abre o dialog de episódios direto (SeriesDetail)
  // — uma vez seguida, marcar episódio é a ação mais útil, não reler a
  // sinopse. O resto abre o MovieDetail (sinopse/elenco/onde assistir).
  const openDetail = (item: { id: number; mediaType: "movie" | "tv" }) => {
    if (item.mediaType === "tv" && followed.has(item.id)) setSeriesDetailId(item.id);
    else setDetail(item);
  };

  // --- Episódios (SeriesDetail) --------------------------------------------
  const patchFollowed = (series: FollowedSeries) => setFollowedList((prev) => prev.map((s) => (s.id === series.id ? series : s)));

  const toggleEpisode = async (series: FollowedSeries, season: number, episode: number) => {
    if (!uid) return;
    const key = String(season);
    const epKey = String(episode);
    const nextWatched = !series.seasons[key].episodes[epKey].watched;

    patchFollowed({
      ...series,
      seasons: {
        ...series.seasons,
        [key]: {
          ...series.seasons[key],
          episodes: { ...series.seasons[key].episodes, [epKey]: { ...series.seasons[key].episodes[epKey], watched: nextWatched } },
        },
      },
    });

    try {
      await setEpisodeWatched(uid, series.id, season, episode, nextWatched);
    } catch (err) {
      console.error("Erro ao marcar episódio:", err);
      patchFollowed(series); // desfaz
    }
  };

  // "Marcar temporada inteira" — resolve TODOS os episódios de uma vez sobre
  // o MESMO snapshot de `series` (sem loop de toggleEpisode: cada chamada
  // pegaria a mesma `series` stale e cada setState sobrescreveria o
  // anterior — bug real já visto ao vivo).
  const toggleSeason = async (series: FollowedSeries, season: number, episodes: number[], watched: boolean) => {
    if (!uid) return;
    const key = String(season);
    const updatedEpisodes = { ...series.seasons[key].episodes };
    for (const ep of episodes) updatedEpisodes[String(ep)] = { ...updatedEpisodes[String(ep)], watched };

    patchFollowed({ ...series, seasons: { ...series.seasons, [key]: { ...series.seasons[key], episodes: updatedEpisodes } } });

    try {
      await setSeasonWatched(uid, series.id, season, episodes, watched);
    } catch (err) {
      console.error("Erro ao marcar temporada:", err);
      patchFollowed(series); // desfaz
    }
  };

  const api: MediaCardsApi = {
    uid,
    watchedMap,
    ratings,
    followed,
    followedList,
    checkedMap,
    availabilityMap,
    pendingIds,
    watchedRevision,
    recentlyWatched,
    isChecked,
    toggleChecked,
    rate,
    playTrailer,
    openDetail,
    loadAvailability,
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
