// src/pages/private/anime/index.tsx
// Página "Animes" (rota /animes) — pedido explícito da Rebecca: "vamos
// fazer uma página exatamente igual, mesma lógica e layout... para
// animes". É a página Séries (@/pages/private/series) inteira, com a
// condição de anime INVERTIDA: lá exclui anime das fileiras de
// descoberta (isAnime, series/functions.ts), aqui só ENTRA quem é anime
// (mesma definição: gênero Animação + produzido no Japão).
//
// REUSA em vez de duplicar tudo que não depende de incluir/excluir
// anime: `SeriesRow`/`SeriesDetail`/`ScrollableRow` (nenhum dos três
// sabe o que é "série" ou "anime" — só renderizam o que recebem),
// `STREAMING_PROVIDERS`/`countryFlagEmoji`/`fetchSeriesWithEpisodes`
// (@/pages/private/series/functions — mesma lista de provedor, mesma
// resolução de temporada/episódio de um id do TMDb) e as três peças da
// Home (`HeroCarousel`/`CreateTimelinePanel`/`FollowedTimelinesRow`, com
// `categoryLock="animes"` e filtro `types.includes("animes")`).
//
// **Reusa até o CSS** — essa página usa as MESMAS classes
// `series-page__*` (ver @/pages/private/series/styles.scss, importado
// abaixo) em vez de um stylesheet próprio: é literalmente o mesmo
// layout, pedido explícito da Rebecca ("mesma lógica e layout"), então
// duplicar ~600 linhas de SCSS idêntico só trocando o prefixo da classe
// não agregava nada — mesma decisão já tomada pra `SeriesDetail`/
// `ScrollableRow`/`SeriesRow`, só que agora pro CSS inteiro da página.
//
// O que É diferente daqui pra Séries: `anime/functions.ts` (descoberta
// TMDb com a condição de anime invertida) e o campo `category: "animes"`
// gravado ao seguir (service/FollowingSettings.ts) — cada página só
// mostra a própria categoria na coleção COMPARTILHADA `users/{uid}/following`.
import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { auth } from "@/service/FirebaseSettings";
import MovieDetail from "@/components/movieDetail";
import { posterUrl } from "@/service/TMDbSettings";
import { fetchTimelines, movieKey, progressPercent, type Timeline } from "@/service/TimelineSettings";
import { fetchWatchedMap, setWatched } from "@/service/WatchedSettings";
import CreateTimelinePanel from "@/pages/private/home/dashboard/CreateTimelinePanel";
import FollowedTimelinesRow from "@/pages/private/home/dashboard/FollowedTimelinesRow";
import HeroCarousel from "@/pages/private/home/dashboard/HeroCarousel";
import type { HeroTrailer } from "@/pages/private/home/dashboard/functions";
import TimelineDetail from "@/pages/private/timelines/TimelineDetail";
import {
  fetchFollowedSeries,
  followSeries,
  followedSeriesProgress,
  setEpisodeWatched,
  setSeasonWatched,
  unfollowSeries,
  type FollowedSeries,
} from "@/service/FollowingSettings";
import { STREAMING_PROVIDERS, fetchSeriesWithEpisodes, type SeriesRowItem } from "@/pages/private/series/functions";
import ScrollableRow from "@/pages/private/series/ScrollableRow";
import SeriesRow from "@/pages/private/series/SeriesRow";
import SeriesDetail from "@/pages/private/series/SeriesDetail";
import "@/pages/private/series/styles.scss";
import { fetchAnimeHeroTrailers, fetchTopAnimeByProvider, fetchTopAnimeOfTheYear } from "./functions";

const ROW_LIMIT = 20;
const HERO_LIMIT = 5;
const TOP_OF_YEAR_LIMIT = 20;

const AnimePage = () => {
  const uid = auth.currentUser?.uid ?? null;

  const [providerRows, setProviderRows] = useState<Record<number, SeriesRowItem[]>>({});
  const [providerErrors, setProviderErrors] = useState<Record<number, string>>({});

  const [topOfYear, setTopOfYear] = useState<SeriesRowItem[] | null>(null);
  const [topOfYearError, setTopOfYearError] = useState<string | null>(null);

  const [followedAnime, setFollowedAnime] = useState<FollowedSeries[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null);

  const [heroTrailers, setHeroTrailers] = useState<HeroTrailer[]>([]);
  const [followedTimelines, setFollowedTimelines] = useState<Timeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);
  const [watchedMap, setWatchedMapState] = useState<Map<string, number>>(new Map());

  // Só categoria "animes" — a mesma collection `users/{uid}/following`
  // também guarda série seguida pela página Séries.
  const loadFollowedAnime = () => {
    if (!uid) return;
    fetchFollowedSeries(uid)
      .then((all) => setFollowedAnime(all.filter((s) => s.category === "animes")))
      .catch((err) => console.error("Erro ao buscar animes seguidos:", err));
  };

  useEffect(() => {
    if (!uid) return;
    loadFollowedAnime();
    fetchWatchedMap(uid)
      .then(setWatchedMapState)
      .catch((err) => console.error("Erro ao buscar filmes/séries vistos:", err));
    fetchTimelines(uid)
      .then((all) => setFollowedTimelines(all.filter((t) => t.followed && t.types.includes("animes"))))
      .catch((err) => console.error("Erro ao buscar timelines seguidas:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    STREAMING_PROVIDERS.forEach((provider) => {
      fetchTopAnimeByProvider(provider.id, ROW_LIMIT)
        .then((items) => setProviderRows((prev) => ({ ...prev, [provider.id]: items })))
        .catch((err) => {
          console.error(`Erro ao buscar animes mais vistos na ${provider.label}:`, err);
          setProviderErrors((prev) => ({ ...prev, [provider.id]: "Não foi possível carregar agora." }));
        });
    });

    fetchAnimeHeroTrailers(HERO_LIMIT)
      .then(setHeroTrailers)
      .catch((err) => console.error("Erro ao buscar trailers do topo:", err));

    fetchTopAnimeOfTheYear(TOP_OF_YEAR_LIMIT)
      .then(setTopOfYear)
      .catch((err) => {
        console.error("Erro ao buscar top 20 do ano:", err);
        setTopOfYearError("Não foi possível carregar agora.");
      });
  }, []);

  const handleToggleWatched = async (item: { id?: number; mediaType?: "movie" | "tv" }) => {
    if (!uid || item.id === undefined || !item.mediaType) return;
    const key = movieKey(item.mediaType, item.id);
    const nextWatched = !watchedMap.has(key);

    const nextMap = new Map(watchedMap);
    if (nextWatched) nextMap.set(key, Date.now());
    else nextMap.delete(key);
    setWatchedMapState(nextMap);

    try {
      await setWatched(uid, key, nextWatched);
    } catch (err) {
      console.error("Erro ao marcar filme/série como visto:", err);
      setWatchedMapState(watchedMap); // desfaz
    }
  };

  const followedIds = new Set(followedAnime.map((s) => s.id));

  const handleToggleFollowed = async (item: SeriesRowItem) => {
    if (!uid || pendingIds.has(item.id)) return;

    if (followedIds.has(item.id)) {
      const previous = followedAnime;
      setFollowedAnime((prev) => prev.filter((s) => s.id !== item.id));
      try {
        await unfollowSeries(uid, item.id);
      } catch (err) {
        console.error("Erro ao deixar de seguir anime:", err);
        setFollowedAnime(previous); // desfaz
      }
      return;
    }

    setPendingIds((prev) => new Set(prev).add(item.id));
    try {
      const { status, seasons } = await fetchSeriesWithEpisodes(item.id);
      await followSeries(uid, { id: item.id, title: item.title, posterPath: item.posterPath, status, category: "animes", seasons });
      loadFollowedAnime();
    } catch (err) {
      console.error("Erro ao seguir anime:", err);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleRemoveAnime = async (anime: FollowedSeries) => {
    if (!uid || deletingId) return;
    if (!window.confirm(`Deixar de seguir "${anime.title}"? Seu progresso de episódios se perde.`)) return;

    setDeletingId(anime.id);
    try {
      await unfollowSeries(uid, anime.id);
      setFollowedAnime((prev) => prev.filter((s) => s.id !== anime.id));
      if (selectedAnimeId === anime.id) setSelectedAnimeId(null);
    } catch (err) {
      console.error("Erro ao deixar de seguir anime:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleEpisode = async (anime: FollowedSeries, season: number, episode: number) => {
    if (!uid) return;
    const key = String(season);
    const epKey = String(episode);
    const nextWatched = !anime.seasons[key].episodes[epKey].watched;

    const updated: FollowedSeries = {
      ...anime,
      seasons: {
        ...anime.seasons,
        [key]: {
          ...anime.seasons[key],
          episodes: { ...anime.seasons[key].episodes, [epKey]: { ...anime.seasons[key].episodes[epKey], watched: nextWatched } },
        },
      },
    };
    setFollowedAnime((prev) => prev.map((s) => (s.id === anime.id ? updated : s)));

    try {
      await setEpisodeWatched(uid, anime.id, season, episode, nextWatched);
    } catch (err) {
      console.error("Erro ao marcar episódio:", err);
      setFollowedAnime((prev) => prev.map((s) => (s.id === anime.id ? anime : s))); // desfaz
    }
  };

  const handleToggleSeason = async (anime: FollowedSeries, season: number, episodes: number[], watched: boolean) => {
    if (!uid) return;
    const key = String(season);
    const updatedEpisodes = { ...anime.seasons[key].episodes };
    for (const ep of episodes) {
      updatedEpisodes[String(ep)] = { ...updatedEpisodes[String(ep)], watched };
    }

    const updated: FollowedSeries = {
      ...anime,
      seasons: { ...anime.seasons, [key]: { ...anime.seasons[key], episodes: updatedEpisodes } },
    };
    setFollowedAnime((prev) => prev.map((s) => (s.id === anime.id ? updated : s)));

    try {
      await setSeasonWatched(uid, anime.id, season, episodes, watched);
    } catch (err) {
      console.error("Erro ao marcar temporada:", err);
      setFollowedAnime((prev) => prev.map((s) => (s.id === anime.id ? anime : s))); // desfaz
    }
  };

  const selectedAnime = selectedAnimeId !== null ? followedAnime.find((s) => s.id === selectedAnimeId) ?? null : null;

  const handlePosterClick = (item: SeriesRowItem) => {
    if (followedIds.has(item.id)) setSelectedAnimeId(item.id);
    else setSelectedItemId(item.id);
  };

  return (
    <div className="series-page">
      <HeroCarousel items={heroTrailers} />

      <CreateTimelinePanel
        uid={uid}
        categoryLock="animes"
        placeholder="Descreva a timeline de animes que você quer. Exemplo: só os animes do Studio Ghibli, ou todo o universo de One Piece"
      />

      <FollowedTimelinesRow timelines={followedTimelines} watchedMap={watchedMap} onSelect={setSelectedTimeline} />

      <div className="series-page__header">
        <div className="series-page__inner">
          <h1 className="series-page__title">Animes</h1>
          <p className="series-page__hint">Os melhor avaliados em cada streaming, e o que você já assistiu dos seus.</p>
        </div>
      </div>

      <section className="series-page__my-series">
        <div className="series-page__inner">
          <h2 className="series-page__row-title">Meus animes</h2>

          {followedAnime.length === 0 && (
            <p className="series-page__empty">Adicione um anime pela busca abaixo pra marcar os episódios que já viu.</p>
          )}

          {followedAnime.length > 0 && (
            <ScrollableRow itemsKey={followedAnime}>
              {followedAnime.map((anime) => {
                const { watched, total } = followedSeriesProgress(anime);
                const pct = progressPercent(watched, total);
                const poster = posterUrl(anime.posterPath);

                return (
                  <div key={anime.id} className="series-page__row-item series-page__my-item">
                    <button
                      type="button"
                      className="series-page__my-card-delete"
                      onClick={() => handleRemoveAnime(anime)}
                      disabled={deletingId === anime.id}
                      aria-label={`Remover ${anime.title}`}
                    >
                      {deletingId === anime.id ? <Loader2 className="series-page__spinner" size={14} /> : <Trash2 size={14} />}
                    </button>

                    <button type="button" className="series-page__row-item-open" onClick={() => setSelectedAnimeId(anime.id)}>
                      {poster ? (
                        <img src={poster} alt={anime.title} className="series-page__row-poster" />
                      ) : (
                        <div className="series-page__row-poster series-page__row-poster--empty" />
                      )}
                      <span className="series-page__row-title-text">{anime.title}</span>
                    </button>
                    <div className="series-page__my-item-progress-bar">
                      <div className="series-page__my-item-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="series-page__my-item-count">
                      visto: {watched}/{total}
                    </span>
                  </div>
                );
              })}
            </ScrollableRow>
          )}
        </div>
      </section>

      <SeriesRow
        title={`Top 20 mais vistos em ${new Date().getFullYear()}`}
        items={topOfYear ?? []}
        loading={topOfYear === null && !topOfYearError}
        error={topOfYearError}
        addedIds={followedIds}
        pendingIds={pendingIds}
        uid={uid}
        onItemClick={handlePosterClick}
        onToggleAdded={handleToggleFollowed}
        addLabel="Adicionar aos meus animes"
        removeLabel="Remover dos meus animes"
      />

      {STREAMING_PROVIDERS.map((provider) => (
        <SeriesRow
          key={provider.id}
          title={`Melhor avaliados na ${provider.label}`}
          items={providerRows[provider.id] ?? []}
          loading={!providerRows[provider.id] && !providerErrors[provider.id]}
          error={providerErrors[provider.id] ?? null}
          addedIds={followedIds}
          pendingIds={pendingIds}
          uid={uid}
          onItemClick={handlePosterClick}
          onToggleAdded={handleToggleFollowed}
          addLabel="Adicionar aos meus animes"
          removeLabel="Remover dos meus animes"
        />
      ))}

      {/* O rodapé inteiro era só a barra de busca — saiu daqui e virou o
          ícone de lupa global da navbar (@/components/appNav →
          @/components/searchModal), pedido explícito da Rebecca: "essa
          barra de search que a gente tem no final das páginas
          filmes/séries/animes pode sair dali e virar só um ícone de
          lupa no navbar". Ver mesmo comentário em
          @/pages/private/series/index.tsx pro que muda no fluxo de
          "seguir" a partir da busca. */}

      {selectedItemId !== null && <MovieDetail id={selectedItemId} mediaType="tv" onClose={() => setSelectedItemId(null)} />}

      {selectedAnime && (
        <SeriesDetail
          series={selectedAnime}
          uid={uid}
          onClose={() => setSelectedAnimeId(null)}
          onToggleEpisode={handleToggleEpisode}
          onToggleSeason={handleToggleSeason}
        />
      )}

      {selectedTimeline && (
        <TimelineDetail
          timeline={selectedTimeline}
          watchedMap={watchedMap}
          uid={uid}
          onClose={() => setSelectedTimeline(null)}
          onToggleWatched={handleToggleWatched}
        />
      )}
    </div>
  );
};

export default AnimePage;
