// src/pages/private/timelines/index.tsx
// Página "Timelines" — grade das timelines salvas do usuário, FILTRADA
// por categoria (`?category=filmes|series|animes|franquias` na URL).
// Antes essa grade vivia dentro da Home; virou página própria porque faz
// mais sentido como destino de navegação separado (gerenciar timelines)
// do que mais uma seção na home de "descobrir conteúdo".
//
// Filtro por categoria é pedido explícito da Rebecca: "na nav em
// timeline, vai virar um menu com dropdown... filmes (exibe a timeline
// de filmes), séries (exibe timeline criada para séries), animes (exibe
// timeline criadas para anime)" — o dropdown em si vive em
// @/components/appNav (link pra cada categoria já com o query param
// certo); essa página só LÊ `category` da URL (`useSearchParams`) e
// filtra por ele. Sem `category` na URL (ou um valor inválido) cai em
// "filmes", a categoria default/mais antiga do app.
//
// "franquias" é a 4ª aba, pedido explícito da Rebecca depois de ver a
// 1ª timeline de franquia na lista: "essas timelines que misturam series
// e filmes ou seja que tem mais de 1 categoria não deve cair na
// categoria outros.. vamos criar a categoria no menu timeline". Por
// isso, diferente das outras 3 (que casam por `.includes`, timeline pode
// "ser" mais de uma), "filmes"/"series"/"animes" aqui exigem
// `types.length === 1` — uma timeline com `types: ["filmes", "series"]`
// (só as de franquia, hoje) NUNCA aparece nas abas Filmes/Séries, só na
// aba Franquias (`types.length > 1`). Ver TimelineCategoryFilter,
// service/TimelineSettings.ts.
//
// "premiacoes" é a 5ª aba, mesmo pedido/motivo: "pode ter a categoria
// premiações tb ali... que vai recever as timelines do oscar, globo de
// ouro e vestival de canes". Timeline de premiação sempre grava `types:
// ["filmes"]` (`awards/timelineSync.ts`) — sem essa aba, ela cairia
// (incorretamente, do ponto de vista da Rebecca) na aba Filmes junto com
// timeline "de verdade" de filme. Identificada por `Timeline.awardSlug`
// (presente só nas 3 auto-criadas por Oscar/Globo de Ouro/Cannes), não
// por `types` — por isso "filmes" agora também exclui quem tem
// `awardSlug`, não só quem tem mais de 1 tipo.
import { useEffect, useState } from "react";
import { Clapperboard, Loader2, Star, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { auth } from "@/service/FirebaseSettings";
import { ROUTES } from "@/service/Routes";
import {
  fetchTimelines,
  deleteTimeline,
  setTimelineFollowed,
  timelineMovieKey,
  timelineProgress,
  progressPercent,
  type Timeline,
  type TimelineCategoryFilter,
  type TimelineMovie,
} from "@/service/TimelineSettings";
import { posterUrl } from "@/service/TMDbSettings";
import { fetchWatchedMap, setWatched } from "@/service/WatchedSettings";
import TimelineDetail from "./TimelineDetail";
import "./styles.scss";

const PREVIEW_POSTER_COUNT = 4;

// `emptyState` — como cada aba explica "como ter uma timeline aqui" no
// estado vazio. As 3 de sempre linkam pro painel "criar timeline" da
// própria página de descoberta; "franquias" não tem um painel de criação
// (a timeline nasce sozinha ao visitar `/franquias/{slug}`, ver
// pages/private/franchise), então o texto é diferente — sem Link de
// "criar", só a instrução de visitar o dropdown "Franquias" da nav.
// `article` concorda em gênero com `label` ("os filmes"/"as séries"/"os
// animes"/"as franquias" — "série"/"franquia" são femininas, "anime" é
// tratado como masculino em português).
const CATEGORY_CONFIG: Record<TimelineCategoryFilter, { label: string; article: string; emptyHint: React.ReactNode }> = {
  filmes: {
    label: "filmes",
    article: "os",
    emptyHint: (
      <>
        Crie uma na <Link to={ROUTES.HOME}>Filmes</Link>!
      </>
    ),
  },
  series: {
    label: "séries",
    article: "as",
    emptyHint: (
      <>
        Crie uma na <Link to={ROUTES.SERIES}>Séries</Link>!
      </>
    ),
  },
  animes: {
    label: "animes",
    article: "os",
    emptyHint: (
      <>
        Crie uma na <Link to={ROUTES.ANIMES}>Animes</Link>!
      </>
    ),
  },
  franquias: {
    label: "franquias",
    article: "as",
    emptyHint: <>Visite uma franquia pelo menu "Franquias" lá em cima — a timeline é criada automaticamente.</>,
  },
  premiacoes: {
    label: "premiações",
    article: "as",
    emptyHint: (
      <>
        Marque "já vi" num indicado do <Link to={ROUTES.OSCAR}>Oscar</Link>, Globo de Ouro ou Festival de Cannes — a
        timeline é criada automaticamente.
      </>
    ),
  },
};

const parseCategory = (raw: string | null): TimelineCategoryFilter =>
  raw === "series" || raw === "animes" || raw === "franquias" || raw === "premiacoes" ? raw : "filmes";

const TimelinesPage = () => {
  const uid = auth.currentUser?.uid ?? null;
  const [searchParams] = useSearchParams();
  const category = parseCategory(searchParams.get("category"));

  const [timelines, setTimelines] = useState<Timeline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // "Já vi" — estado GLOBAL por filme (service/WatchedSettings.ts), não
  // por timeline: o mesmo filme em duas timelines diferentes compartilha
  // essa marcação (pedido explícito da Rebecca — "a timeline é um
  // agrupamento", não dona do estado de visto).
  const [watchedMap, setWatchedMapState] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!uid) {
      setTimelines([]);
      return;
    }
    fetchTimelines(uid)
      .then(setTimelines)
      .catch((err) => {
        console.error("Erro ao buscar timelines:", err);
        setError("Não foi possível carregar suas timelines agora.");
      });

    fetchWatchedMap(uid)
      .then(setWatchedMapState)
      .catch((err) => console.error("Erro ao buscar filmes vistos:", err));
  }, [uid]);

  const handleToggleWatched = async (movie: TimelineMovie) => {
    if (!uid) return;
    const key = timelineMovieKey(movie);
    const nextWatched = !watchedMap.has(key);

    const nextMap = new Map(watchedMap);
    if (nextWatched) nextMap.set(key, Date.now());
    else nextMap.delete(key);
    setWatchedMapState(nextMap);

    try {
      await setWatched(uid, key, nextWatched);
    } catch (err) {
      console.error("Erro ao marcar filme como visto:", err);
      setWatchedMapState(watchedMap); // desfaz
    }
  };

  // "Seguir" — timeline seguida passa a aparecer na página de descoberta
  // da própria categoria (ver home/dashboard, series/index.tsx,
  // anime/index.tsx, "Timelines que você segue"). Otimista, desfaz se a
  // gravação falhar.
  const handleToggleFollowed = async (timeline: Timeline) => {
    if (!uid) return;
    const nextFollowed = !timeline.followed;

    setTimelines((prev) => (prev ? prev.map((t) => (t.id === timeline.id ? { ...t, followed: nextFollowed } : t)) : prev));

    try {
      await setTimelineFollowed(uid, timeline.id, nextFollowed);
    } catch (err) {
      console.error("Erro ao seguir/deixar de seguir timeline:", err);
      setTimelines((prev) => (prev ? prev.map((t) => (t.id === timeline.id ? { ...t, followed: timeline.followed } : t)) : prev));
    }
  };

  const handleDeleteTimeline = async (timeline: Timeline) => {
    if (!uid || deletingId) return;
    if (!window.confirm(`Apagar a timeline "${timeline.name}"? Essa ação não pode ser desfeita.`)) return;

    setDeletingId(timeline.id);
    setDeleteError(null);
    try {
      await deleteTimeline(uid, timeline.id);
      setTimelines((prev) => (prev ? prev.filter((t) => t.id !== timeline.id) : prev));
    } catch (err) {
      console.error("Erro ao apagar timeline:", err);
      setDeleteError("Não foi possível apagar a timeline agora.");
    } finally {
      setDeletingId(null);
    }
  };

  const config = CATEGORY_CONFIG[category];
  // "franquias" junta toda timeline com MAIS de 1 tipo (só as de
  // franquia hoje, `types: ["filmes", "series"]`); "premiacoes" junta
  // toda timeline com `awardSlug` (as 3 auto-criadas por Oscar/Globo de
  // Ouro/Cannes, sempre `types: ["filmes"]`) — as outras 3
  // (filmes/series/animes) exigem exatamente 1 tipo E nenhum `awardSlug`,
  // pra timeline mista ou de premiação nunca cair (também) nelas. Ver
  // comentário do topo do arquivo.
  const categoryTimelines = (timelines ?? []).filter((t) => {
    if (category === "franquias") return t.types.length > 1;
    if (category === "premiacoes") return Boolean(t.awardSlug);
    return t.types.length === 1 && t.types.includes(category) && !t.awardSlug;
  });

  return (
    <div className="timelines-page">
      <div className="timelines-page__inner">
        <h1 className="timelines-page__title">Minhas timelines de {config.label}</h1>
        <p className="timelines-page__hint">
          Gerencie {config.article} {config.label} que quer ver aqui.
        </p>

        {timelines === null && (
          <p className="timelines-page__loading">
            <Loader2 className="timelines-page__spinner" size={18} />
            Carregando timelines...
          </p>
        )}

        {error && <p className="timelines-page__error">{error}</p>}
        {deleteError && <p className="timelines-page__error">{deleteError}</p>}

        {timelines && categoryTimelines.length === 0 && !error && (
          <p className="timelines-page__empty">
            Você ainda não tem nenhuma timeline de {config.label}. {config.emptyHint} Se quiser entender melhor como funciona,{" "}
            <Link to={ROUTES.ABOUT}>saiba mais aqui</Link>.
          </p>
        )}

        <div className="timelines-page__grid">
          {categoryTimelines.map((timeline) => {
            const { watched, total } = timelineProgress(timeline, watchedMap);
            const pct = progressPercent(watched, total);
            const previewPosters = timeline.movies.slice(0, PREVIEW_POSTER_COUNT);
            const isFollowed = Boolean(timeline.followed);

            return (
              <div key={timeline.id} className="timelines-page__card">
                <div className="timelines-page__card-posters">
                  {previewPosters.length > 0 ? (
                    previewPosters.map((movie) => {
                      const poster = posterUrl(movie.posterPath);
                      return poster ? (
                        <img key={timelineMovieKey(movie)} src={poster} alt="" className="timelines-page__card-poster" />
                      ) : (
                        <div key={timelineMovieKey(movie)} className="timelines-page__card-poster timelines-page__card-poster--empty" />
                      );
                    })
                  ) : (
                    <div className="timelines-page__card-poster timelines-page__card-poster--empty">
                      <Clapperboard size={20} />
                    </div>
                  )}

                  <div className="timelines-page__card-scrim" />

                  <div className="timelines-page__card-actions">
                    <button
                      type="button"
                      className={isFollowed ? "timelines-page__card-follow timelines-page__card-follow--active" : "timelines-page__card-follow"}
                      onClick={() => handleToggleFollowed(timeline)}
                      disabled={!uid}
                      title={isFollowed ? "Deixar de seguir" : "Seguir (aparece na página de descoberta)"}
                      aria-label={isFollowed ? "Deixar de seguir" : "Seguir (aparece na página de descoberta)"}
                    >
                      <Star size={15} fill={isFollowed ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      className="timelines-page__card-delete"
                      onClick={() => handleDeleteTimeline(timeline)}
                      disabled={!uid || deletingId === timeline.id}
                      aria-label={`Apagar timeline ${timeline.name}`}
                    >
                      {deletingId === timeline.id ? <Loader2 className="timelines-page__spinner" size={14} /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>

                <button type="button" className="timelines-page__card-open" onClick={() => setSelectedTimeline(timeline)}>
                  <span className="timelines-page__card-name">{timeline.name}</span>
                  <div className="timelines-page__progress-bar">
                    <div className="timelines-page__progress-fill" style={{ width: `${pct}%` }} />
                    <span className="timelines-page__progress-label">
                      visto: {watched}/{total}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

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

export default TimelinesPage;
