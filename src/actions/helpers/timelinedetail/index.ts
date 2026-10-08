import { timelineMovieKey, type Timeline } from "@/actions/helpers/timelines";
import type { MediaItem } from "@/types/media";

// Títulos da timeline como itens de card (com o ano no título).
// usado em: TimelineDetail
export const timelineItems = (timeline: Timeline): MediaItem[] =>
  timeline.movies.map((movie) => ({
    id: movie.id,
    mediaType: movie.mediaType,
    title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
    posterPath: movie.posterPath,
  }));

// "visto: X/Y (Z%)" da timeline (marcado = filme visto ou série/anime seguido).
// usado em: presentation/cycleprogress, TimelineDetail
export const timelineWatchedSummary = (timeline: Timeline, checkedMap: Map<string, number>) => {
  const total = timeline.movies.length;
  const watched = timeline.movies.filter((movie) => checkedMap.has(timelineMovieKey(movie))).length;
  return { watched, total, pct: total === 0 ? 0 : Math.round((watched / total) * 100) };
};
