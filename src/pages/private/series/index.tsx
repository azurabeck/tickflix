// src/pages/private/series/index.tsx
// Página "Séries" (rota /series) — pedido explícito da Rebecca: "vamos
// fazer a aba de séries... primeiro a visualização das séries mais
// vistas de cada streaming... uma barra de procurar, quando eu adicionar
// uma série eu posso marcar quais episódios eu já assisti daquela
// série." Segue o mesmo layout full-bleed da Home
// (@/pages/private/home/dashboard): cada seção ocupa 100% da largura com
// a própria cor de fundo, só o CONTEÚDO fica limitado por dentro
// (.series-page__inner).
//
// Ganhou depois a MESMA estrutura inicial da Home — pedido explícito da
// Rebecca: "vamos fazer essa mesma estrutura inicial da página de filmes
// para a página de séries... trailer das séries mais populares da
// atualidade (com mais avaliações) depois a barra para criar timeline, e
// a área de timelines... olho em filmes, é o mesmo só que relativo a
// séries". Três peças REUSADAS de @/pages/private/home/dashboard (mesmos
// componentes, mesmo CSS `dashboard__*` já global — nenhuma cópia):
// `HeroCarousel` (trailer, dados vêm de fetchSeriesHeroTrailers,
// functions.ts — mesma ponderação por voto das fileiras de streaming,
// sem filtro de streaming nenhum), `CreateTimelinePanel` (com
// `categoryLock="series"`: resultado só série, timeline sai com
// categoria "series") e `FollowedTimelinesRow` (só timelines seguidas de
// categoria "series" — a mesma fileira na Home mostra só "filmes", a da
// página Animes mostra só "animes").
//
// Ordem completa: Hero → criar timeline → timelines seguidas (série) →
// "Minhas séries" (séries seguidas pra marcar episódio, ver
// service/FollowingSettings.ts) → fileiras "Melhor avaliadas na
// {streaming}" → busca (rodapé).
//
// Diferente do resto do app, "Minhas séries"/as fileiras de streaming
// NÃO têm o @/components/watchButton global de "já vi" — o que importa
// ali é "seguir" a série (libera marcar episódio por episódio via
// SeriesDetail), ação mais específica que o toggle genérico. Já a
// fileira "timelines que você segue" (herdada da Home) SEGUE usando o
// "já vi" global de sempre (service/WatchedSettings.ts) — é sobre
// timeline, um conceito diferente do de série seguida.
import { useEffect, useState } from "react";
import { Check, Loader2, Plus, Search, Star, Trash2 } from "lucide-react";
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
import {
  STREAMING_PROVIDERS,
  countryFlagEmoji,
  fetchSeriesHeroTrailers,
  fetchSeriesWithEpisodes,
  fetchTopSeriesByProvider,
  fetchTopSeriesOfTheYear,
  searchSeries,
  type SeriesRowItem,
} from "./functions";
import ScrollableRow from "./ScrollableRow";
import SeriesRow from "./SeriesRow";
import SeriesDetail from "./SeriesDetail";
import "./styles.scss";

// Pedido explícito da Rebecca: "vamos fazer top 20" — top 20 melhor
// avaliadas por streaming, não o ROW_LIMIT=8 genérico das fileiras da
// Home.
const ROW_LIMIT = 20;
const SEARCH_LIMIT = 12;
const HERO_LIMIT = 5; // mesmo teto do carrossel da Home
// "Top 20 mais vistas no ano" — pedido explícito da Rebecca: "que segue
// o mesmo critério dos trailers" (fetchTopSeriesOfTheYear, functions.ts:
// first_air_date_year do ano atual + sort_by=vote_count.desc, sem
// ponderar nota).
const TOP_OF_YEAR_LIMIT = 20;

const SeriesPage = () => {
  const uid = auth.currentUser?.uid ?? null;

  const [providerRows, setProviderRows] = useState<Record<number, SeriesRowItem[]>>({});
  const [providerErrors, setProviderErrors] = useState<Record<number, string>>({});

  // "Top 20 mais vistas no ano" — mesmo critério do carrossel de
  // trailers (fetchTopSeriesOfTheYear), abaixo de "Minhas séries".
  const [topOfYear, setTopOfYear] = useState<SeriesRowItem[] | null>(null);
  const [topOfYearError, setTopOfYearError] = useState<string | null>(null);

  const [followedSeries, setFollowedSeries] = useState<FollowedSeries[]>([]);
  // Ids em processo de seguir (aguardando resolver temporadas + episódios
  // no TMDb antes de gravar) — desabilita o botão pra não disparar duas
  // vezes.
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SeriesRowItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);

  // --- Estrutura herdada da Home (Hero + criar timeline + timelines
  // seguidas) — ver comentário no topo do arquivo.
  const [heroTrailers, setHeroTrailers] = useState<HeroTrailer[]>([]);
  const [followedTimelines, setFollowedTimelines] = useState<Timeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);
  // "Já vi" global (service/WatchedSettings.ts) — só usado aqui pra
  // calcular o progresso das timelines seguidas (TimelineDetail/
  // FollowedTimelinesRow), igual a Home faz. Sem relação nenhuma com o
  // progresso de EPISÓDIO das séries seguidas (esse é outro conceito,
  // service/FollowingSettings.ts).
  const [watchedMap, setWatchedMapState] = useState<Map<string, number>>(new Map());

  // Só categoria "series" — a mesma collection agora também guarda anime
  // seguido pela página Animes (service/FollowingSettings.ts,
  // `FollowedCategory`); cada página filtra a própria.
  const loadFollowedSeries = () => {
    if (!uid) return;
    fetchFollowedSeries(uid)
      .then((all) => setFollowedSeries(all.filter((s) => s.category === "series")))
      .catch((err) => console.error("Erro ao buscar séries seguidas:", err));
  };

  useEffect(() => {
    if (!uid) return;
    loadFollowedSeries();
    fetchWatchedMap(uid)
      .then(setWatchedMapState)
      .catch((err) => console.error("Erro ao buscar filmes/séries vistos:", err));
    // Categoria "series" só — pedido explícito da Rebecca: a mesma
    // fileira na Home mostra só as de categoria "filmes".
    fetchTimelines(uid)
      .then((all) => setFollowedTimelines(all.filter((t) => t.followed && t.types.includes("series"))))
      .catch((err) => console.error("Erro ao buscar timelines seguidas:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    STREAMING_PROVIDERS.forEach((provider) => {
      fetchTopSeriesByProvider(provider.id, ROW_LIMIT)
        .then((items) => setProviderRows((prev) => ({ ...prev, [provider.id]: items })))
        .catch((err) => {
          console.error(`Erro ao buscar séries mais vistas na ${provider.label}:`, err);
          setProviderErrors((prev) => ({ ...prev, [provider.id]: "Não foi possível carregar agora." }));
        });
    });

    fetchSeriesHeroTrailers(HERO_LIMIT)
      .then(setHeroTrailers)
      .catch((err) => console.error("Erro ao buscar trailers do topo:", err));

    fetchTopSeriesOfTheYear(TOP_OF_YEAR_LIMIT)
      .then(setTopOfYear)
      .catch((err) => {
        console.error("Erro ao buscar top 20 do ano:", err);
        setTopOfYearError("Não foi possível carregar agora.");
      });
  }, []);

  // Toggle "já vi" (TimelineDetail, das timelines seguidas) — mesmo
  // padrão de home/dashboard/index.tsx, estado global compartilhado com
  // o resto do app (service/WatchedSettings.ts).
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

  const followedIds = new Set(followedSeries.map((s) => s.id));

  // Toggle "seguir" — usado tanto nas fileiras de streaming quanto na
  // busca do rodapé. Seguir exige resolver temporadas + TODOS os
  // episódios no TMDb antes (fetchSeriesWithEpisodes), então não dá pra
  // ser 100% otimista feito o toggle de "já vi" do resto do app; deixar
  // de seguir é otimista igual ao padrão (desfaz recarregando se a
  // gravação falhar).
  const handleToggleFollowed = async (item: SeriesRowItem) => {
    if (!uid || pendingIds.has(item.id)) return;

    if (followedIds.has(item.id)) {
      const previous = followedSeries;
      setFollowedSeries((prev) => prev.filter((s) => s.id !== item.id));
      try {
        await unfollowSeries(uid, item.id);
      } catch (err) {
        console.error("Erro ao deixar de seguir série:", err);
        setFollowedSeries(previous); // desfaz
      }
      return;
    }

    setPendingIds((prev) => new Set(prev).add(item.id));
    try {
      const { status, seasons } = await fetchSeriesWithEpisodes(item.id);
      await followSeries(uid, { id: item.id, title: item.title, posterPath: item.posterPath, status, category: "series", seasons });
      loadFollowedSeries();
    } catch (err) {
      console.error("Erro ao seguir série:", err);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Remoção deliberada pela grade "Minhas séries" (lixeira do card) —
  // mesma ação de handleToggleFollowed pro caso "já seguida", só que com
  // confirmação (perde o progresso de episódios todo, diferente do
  // toggle rápido nas fileiras/busca, que é sobre entrar/sair da lista
  // antes de ter progresso nenhum na prática).
  const handleRemoveSeries = async (series: FollowedSeries) => {
    if (!uid || deletingId) return;
    if (!window.confirm(`Deixar de seguir "${series.title}"? Seu progresso de episódios se perde.`)) return;

    setDeletingId(series.id);
    try {
      await unfollowSeries(uid, series.id);
      setFollowedSeries((prev) => prev.filter((s) => s.id !== series.id));
      if (selectedSeriesId === series.id) setSelectedSeriesId(null);
    } catch (err) {
      console.error("Erro ao deixar de seguir série:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleEpisode = async (series: FollowedSeries, season: number, episode: number) => {
    if (!uid) return;
    const key = String(season);
    const epKey = String(episode);
    const nextWatched = !series.seasons[key].episodes[epKey].watched;

    const updated: FollowedSeries = {
      ...series,
      seasons: {
        ...series.seasons,
        [key]: {
          ...series.seasons[key],
          episodes: { ...series.seasons[key].episodes, [epKey]: { ...series.seasons[key].episodes[epKey], watched: nextWatched } },
        },
      },
    };
    setFollowedSeries((prev) => prev.map((s) => (s.id === series.id ? updated : s)));

    try {
      await setEpisodeWatched(uid, series.id, season, episode, nextWatched);
    } catch (err) {
      console.error("Erro ao marcar episódio:", err);
      setFollowedSeries((prev) => prev.map((s) => (s.id === series.id ? series : s))); // desfaz
    }
  };

  // "Marcar temporada inteira" (SeriesDetail.tsx) — resolve TODOS os
  // episódios de uma vez sobre o MESMO snapshot de `series` (sem loop de
  // handleToggleEpisode: cada chamada individual pegaria a mesma `series`
  // stale e cada `setState` subsequente sobrescreveria o anterior, bug
  // real já visto ao vivo — só o último episódio do loop "sobrevivia").
  const handleToggleSeason = async (series: FollowedSeries, season: number, episodes: number[], watched: boolean) => {
    if (!uid) return;
    const key = String(season);
    const updatedEpisodes = { ...series.seasons[key].episodes };
    for (const ep of episodes) {
      updatedEpisodes[String(ep)] = { ...updatedEpisodes[String(ep)], watched };
    }

    const updated: FollowedSeries = {
      ...series,
      seasons: { ...series.seasons, [key]: { ...series.seasons[key], episodes: updatedEpisodes } },
    };
    setFollowedSeries((prev) => prev.map((s) => (s.id === series.id ? updated : s)));

    try {
      await setSeasonWatched(uid, series.id, season, episodes, watched);
    } catch (err) {
      console.error("Erro ao marcar temporada:", err);
      setFollowedSeries((prev) => prev.map((s) => (s.id === series.id ? series : s))); // desfaz
    }
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q || searchLoading) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      setSearchResults(await searchSeries(q, SEARCH_LIMIT));
    } catch (err) {
      console.error("Erro na busca de séries:", err);
      setSearchError("Não foi possível buscar agora.");
    } finally {
      setSearchLoading(false);
    }
  };

  const selectedSeries = selectedSeriesId !== null ? followedSeries.find((s) => s.id === selectedSeriesId) ?? null : null;

  // Clicar num pôster de série já seguida abre o dialog de episódios
  // direto (SeriesDetail) em vez do @/components/movieDetail genérico —
  // uma vez seguida, marcar episódio é a ação mais útil, não reler a
  // sinopse de novo. Série ainda NÃO seguida continua abrindo o
  // MovieDetail normal (sinopse/elenco/onde assistir), igual ao resto do
  // app.
  const handlePosterClick = (item: SeriesRowItem) => {
    if (followedIds.has(item.id)) setSelectedSeriesId(item.id);
    else setSelectedItemId(item.id);
  };

  return (
    <div className="series-page">
      <HeroCarousel items={heroTrailers} />

      <CreateTimelinePanel
        uid={uid}
        categoryLock="series"
        placeholder="Descreva a timeline de séries que você quer. Exemplo: só as séries da Marvel, ou todas as séries do Pedro Pascal"
      />

      <FollowedTimelinesRow timelines={followedTimelines} watchedMap={watchedMap} onSelect={setSelectedTimeline} />


      {/* "Minhas séries" no TOPO da página (antes das fileiras de
          streaming) — pedido explícito da Rebecca: é o que importa ver
          primeiro ao voltar na página, não precisar rolar por 6 fileiras
          de descoberta pra achar a própria lista. */}
      <section className="series-page__my-series">
        <div className="series-page__inner">
          <h2 className="series-page__row-title">Minhas séries</h2>

          {followedSeries.length === 0 && (
            <p className="series-page__empty">Adicione uma série pela busca abaixo pra marcar os episódios que já viu.</p>
          )}

          {followedSeries.length > 0 && (
            <ScrollableRow itemsKey={followedSeries}>
              {followedSeries.map((series) => {
                const { watched, total } = followedSeriesProgress(series);
                const pct = progressPercent(watched, total);
                const poster = posterUrl(series.posterPath);

                return (
                  <div key={series.id} className="series-page__row-item series-page__my-item">
                    <button
                      type="button"
                      className="series-page__my-card-delete"
                      onClick={() => handleRemoveSeries(series)}
                      disabled={deletingId === series.id}
                      aria-label={`Remover ${series.title}`}
                    >
                      {deletingId === series.id ? <Loader2 className="series-page__spinner" size={14} /> : <Trash2 size={14} />}
                    </button>

                    <button type="button" className="series-page__row-item-open" onClick={() => setSelectedSeriesId(series.id)}>
                      {poster ? (
                        <img src={poster} alt={series.title} className="series-page__row-poster" />
                      ) : (
                        <div className="series-page__row-poster series-page__row-poster--empty" />
                      )}
                      <span className="series-page__row-title-text">{series.title}</span>
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
        title={`Top 20 mais vistas em ${new Date().getFullYear()}`}
        items={topOfYear ?? []}
        loading={topOfYear === null && !topOfYearError}
        error={topOfYearError}
        addedIds={followedIds}
        pendingIds={pendingIds}
        uid={uid}
        onItemClick={handlePosterClick}
        onToggleAdded={handleToggleFollowed}
      />

      {STREAMING_PROVIDERS.map((provider) => (
        <SeriesRow
          key={provider.id}
          title={`Melhor avaliadas na ${provider.label}`}
          items={providerRows[provider.id] ?? []}
          loading={!providerRows[provider.id] && !providerErrors[provider.id]}
          error={providerErrors[provider.id] ?? null}
          addedIds={followedIds}
          pendingIds={pendingIds}
          uid={uid}
          onItemClick={handlePosterClick}
          onToggleAdded={handleToggleFollowed}
        />
      ))}

      <footer className="series-page__footer">
        <div className="series-page__inner series-page__footer-inner">
          <div className="series-page__search">
            <input
              type="text"
              className="series-page__search-input"
              placeholder="PROCURAR SÉRIE"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button type="button" className="series-page__search-button" onClick={handleSearch} disabled={searchLoading}>
              {searchLoading ? <Loader2 className="series-page__spinner" size={16} /> : <Search size={16} />}
            </button>
          </div>

          {searchError && <p className="series-page__error">{searchError}</p>}

          {searchResults && (
            <div className="series-page__search-results">
              {searchResults.length === 0 && <p className="series-page__empty">Nada encontrado.</p>}
              {searchResults.map((item) => {
                const poster = posterUrl(item.posterPath);
                const isAdded = followedIds.has(item.id);
                const isPending = pendingIds.has(item.id);
                const flag = countryFlagEmoji(item.originCountry);
                return (
                  <div key={item.id} className="series-page__search-result">
                    <button type="button" className="series-page__search-result-open" onClick={() => handlePosterClick(item)}>
                      {poster ? (
                        <img src={poster} alt={item.title} className="series-page__search-poster" />
                      ) : (
                        <div className="series-page__search-poster series-page__search-poster--empty" />
                      )}
                      <span>{item.title}</span>
                      {item.voteAverage > 0 && (
                        <span className="series-page__row-rating">
                          <Star size={11} fill="currentColor" />
                          {item.voteAverage.toFixed(1)}
                          {flag && <span className="series-page__row-flag">{flag}</span>}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={isAdded ? "series-page__add-btn series-page__add-btn--active" : "series-page__add-btn"}
                      onClick={() => handleToggleFollowed(item)}
                      disabled={!uid || isPending}
                      title={isAdded ? "Remover das minhas séries" : "Adicionar às minhas séries"}
                      aria-label={isAdded ? "Remover das minhas séries" : "Adicionar às minhas séries"}
                    >
                      {isPending ? <Loader2 className="series-page__spinner" size={14} /> : isAdded ? <Check size={14} /> : <Plus size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </footer>

      {selectedItemId !== null && <MovieDetail id={selectedItemId} mediaType="tv" onClose={() => setSelectedItemId(null)} />}

      {selectedSeries && (
        <SeriesDetail
          series={selectedSeries}
          uid={uid}
          onClose={() => setSelectedSeriesId(null)}
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

export default SeriesPage;
