import { useEffect, useState } from "react";
import { useMediaCards } from "@/contexts/MediaCards";
import { auth } from "@/service/FirebaseSettings";
import { createFranchiseTimeline, fetchTimelineByFranchise, timelineMovieKey, type Timeline } from "@/actions/helpers/timelines";
import { resolveTimelineMovies } from "@/actions/helpers/timelineai";
import { fetchFranchiseCatalog, saveFranchiseCatalog, type FranchiseConfig } from "@/actions/franchises/catalog";
import type { MediaItem } from "@/types/media";

// Ciclo "página de uma franquia": acha a timeline do usuário (ou monta a lista inteira via catálogo
// global / IA na primeira vez) e deixa a lista pronta pra virar cards.
// usado em: página Franquias
export const useFranchisesDashboard = (config: FranchiseConfig | null) => {
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

          fetchFranchiseCatalog(config)
            .then((catalog) => {
              if (!catalog) return saveFranchiseCatalog(config, existing.movies);
            })
            .catch((err) => console.error(`Erro ao verificar/gravar catálogo global da franquia ${config.slug}:`, err));
          return;
        }

        const catalog = await fetchFranchiseCatalog(config);
        let movies = catalog?.movies ?? null;

        if (!movies || movies.length === 0) {
          const draft = await resolveTimelineMovies(config.query);
          movies = draft.movies;
          await saveFranchiseCatalog(config, movies).catch((err) => console.error(`Erro ao gravar catálogo global da franquia ${config.slug}:`, err));
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
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.slug, uid]);

  const movies = timeline?.movies ?? [];
  const items: MediaItem[] = movies.map((movie) => ({
    id: movie.id,
    mediaType: movie.mediaType,
    title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
    posterPath: movie.posterPath,
  }));
  const watchedCount = movies.filter((movie) => media.checkedMap.has(timelineMovieKey(movie))).length;

  return { hasTimeline: timeline !== null, loading, error, items, watchedCount };
};
