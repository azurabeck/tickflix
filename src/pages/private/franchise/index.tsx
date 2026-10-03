// src/pages/private/franchise/index.tsx
// Página de uma franquia (Marvel, DC, Mundo Mágico...) — rota dinâmica
// `/franquias/:slug` (a primeira rota parametrizada do app, ver
// service/Routes.ts).
//
// DUAS camadas de cache, pedido explícito da Rebecca: "vc seguiu a mesma
// lógica do oscar?... salvar os dados numa collection única e atrelar
// com os dados os filme para não ficar usando a ia toda hora?" — ver
// franchiseConfigs.ts pro histórico completo.
// 1. Catálogo GLOBAL (`functions.ts` deste módulo, collection própria
//    por franquia — `marvel`, `dc`, etc., compartilhada por TODOS os
//    usuários) — resolvido via IA (`resolveTimelineMovies`, o MESMO
//    motor do painel "criar timeline") só na PRIMEIRA vez que QUALQUER
//    usuário visita essa franquia, entre todos os usuários do app.
// 2. Timeline PRÓPRIA do usuário (`Timeline.franchiseSlug`,
//    service/TimelineSettings.ts) — criada na primeira visita DESSE
//    usuário, copiando os filmes do catálogo global (sem chamar IA de
//    novo) — é o que dá "já vi"/progresso/aparecer na página Timelines
//    (aba Franquias) pra esse usuário, igual toda outra timeline.
//
// Ordem de leitura em `index.tsx`: timeline do usuário → catálogo global
// → só then resolve via IA (e grava nos DOIS lugares) se nem um nem
// outro existir ainda.
//
// Grade de CARDS GLOBAIS (@/components/mediaCard) — o mesmo padrão de
// pages/private/timelines/TimelineDetail.tsx, só que como página cheia em
// vez de dialog: uma página de franquia já É o "detalhe", não precisa de
// mais um nível de modal por cima. Franquia mistura filmes E séries: filme
// vira o card `movie` (check = assisti), série o card `serie` (check =
// estou assistindo). O estado dos cards é global (MediaCardsProvider).
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";
import { ConnectedMediaCard, cardKey, useMediaCards, useOpenCard, type MediaItem } from "@/components/mediaCard";
import { auth } from "@/service/FirebaseSettings";
import { ROUTES } from "@/service/Routes";
import {
  createFranchiseTimeline,
  fetchTimelineByFranchise,
  timelineMovieKey,
  type Timeline,
} from "@/service/TimelineSettings";
import { resolveTimelineMovies } from "@/pages/private/home/dashboard/functions";
import { findFranchiseConfig } from "./franchiseConfigs";
import { fetchFranchiseCatalog, saveFranchiseCatalog } from "./functions";
import "@/pages/private/timelines/styles.scss";
import "./styles.scss";

const FranchisePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const config = findFranchiseConfig(slug);
  const uid = auth.currentUser?.uid ?? null;
  const media = useMediaCards();

  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config || !uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const existing = await fetchTimelineByFranchise(uid, config.slug);
        if (existing) {
          if (!cancelled) setTimeline(existing);
          // Self-heal: timeline de franquia criada ANTES do catálogo
          // global existir (ver franchiseConfigs.ts) nunca "doou" seus
          // filmes já resolvidos pro catálogo — sem isso, essa franquia
          // específica nunca ganharia catálogo global sozinha (esse
          // usuário sempre cai aqui, satisfeito pela própria timeline, e
          // nunca chega no bloco abaixo que grava o catálogo). Best-effort,
          // não bloqueia a UI: só copia o que já foi resolvido, sem
          // chamar IA de novo.
          fetchFranchiseCatalog(config)
            .then((catalog) => {
              if (!catalog) return saveFranchiseCatalog(config, existing.movies);
            })
            .catch((err) => console.error(`Erro ao verificar/gravar catálogo global da franquia ${config.slug}:`, err));
          return;
        }

        // Primeira visita DESSE usuário — tenta o catálogo GLOBAL antes
        // de chamar IA (pode já ter sido resolvido por OUTRO usuário
        // visitando essa mesma franquia antes). Só resolve via IA+TMDb
        // (mesmo motor do painel "criar timeline") se nem o catálogo
        // global existir ainda — nesse caso grava nos DOIS lugares: o
        // catálogo (pra nenhum usuário futuro precisar de IA de novo) e a
        // timeline própria deste usuário. `skipCollectionAxis: true` —
        // franquia aqui é sempre "filmes E séries", e o eixo /collection
        // do TMDb só cobre filme.
        const catalog = await fetchFranchiseCatalog(config);
        let movies = catalog?.movies ?? null;

        if (!movies || movies.length === 0) {
          const draft = await resolveTimelineMovies(config.query, undefined, { skipCollectionAxis: true });
          movies = draft.movies;
          await saveFranchiseCatalog(config, movies).catch((err) =>
            console.error(`Erro ao gravar catálogo global da franquia ${config.slug}:`, err)
          );
        }

        const timelineId = await createFranchiseTimeline(uid, config.slug, config.name, ["filmes", "series"], movies);
        if (!cancelled) {
          setTimeline({ id: timelineId, name: config.name, types: ["filmes", "series"], movies, createdAt: null, franchiseSlug: config.slug });
        }
      } catch (err) {
        console.error(`Erro ao resolver franquia ${config.slug}:`, err);
        if (!cancelled) setError("Não foi possível carregar os filmes e séries dessa franquia agora.");
      } finally {
        if (!cancelled) setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();

    return () => {
      cancelled = true;
    };
  }, [config?.slug, uid]);

  // Claquete ("disponível em streaming/aluguel") dos títulos da franquia.
  useEffect(() => {
    if (timeline) media.loadAvailability(timeline.movies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);


  const movies = timeline?.movies ?? [];
  const items: MediaItem[] = movies.map((movie) => ({
    id: movie.id,
    mediaType: movie.mediaType,
    title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
    posterPath: movie.posterPath,
  }));
  const watchedCount = movies.filter((movie) => media.checkedMap.has(timelineMovieKey(movie))).length;
  const open = useOpenCard(items);

  if (!config) return <Navigate to={ROUTES.HOME} replace />;


  return (
    <div className="franchise-page">
      <div className="franchise-page__inner">
        <h1 className="franchise-page__title">{config.name}</h1>
        <p className="franchise-page__subtitle">Todos os filmes e séries — marque o que você já viu.</p>

        {loading && (
          <p className="timelines-page__loading">
            <Loader2 className="timelines-page__spinner" size={18} />
            {timeline ? "Carregando..." : "Montando a lista completa dessa franquia (pode levar alguns segundos)..."}
          </p>
        )}

        {error && <p className="timelines-page__error">{error}</p>}

        {!loading && !error && movies.length > 0 && (
          <p className="franchise-page__progress">
            visto: {watchedCount}/{movies.length}
          </p>
        )}

        {!loading && !error && (
          <div className="media-grid">
            {items.map((item, index) => {
              const id = cardKey(item, index);
              return <ConnectedMediaCard key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FranchisePage;
