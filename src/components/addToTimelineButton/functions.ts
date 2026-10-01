// src/components/addToTimelineButton/functions.ts
import { fetchTitleById } from "@/service/TMDbSettings";
import type { ContentType, TimelineMovie } from "@/service/TimelineSettings";

export interface AddableMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
}

// `TimelineMovie` exige `year` — nem todo pôster do app tem isso à mão
// (MovieRowItem/DashboardMovie/AwardNominee só guardam id/mediaType/
// título/pôster). Resolvido aqui, só na hora de adicionar DE VERDADE (não
// em toda renderização do botão) — um `/movie|tv/{id}` a mais por clique,
// barato e raro.
export const toTimelineMovie = async (movie: AddableMovie): Promise<TimelineMovie> => {
  const resolved = await fetchTitleById(movie.mediaType, movie.id);
  return {
    id: movie.id,
    mediaType: movie.mediaType,
    title: movie.title,
    year: resolved?.year ?? "",
    posterPath: movie.posterPath,
    watched: false,
    watchedAt: null,
  };
};

// Timeline manual pode misturar filme e série (mesma ideia já usada pela
// timeline de franquia, pages/private/franchise) — `types` reflete o que
// foi adicionado de verdade, não um valor fixo.
export const typesFromMovies = (movies: TimelineMovie[]): ContentType[] => {
  const types: ContentType[] = [];
  if (movies.some((m) => m.mediaType === "movie")) types.push("filmes");
  if (movies.some((m) => m.mediaType === "tv")) types.push("series");
  return types.length > 0 ? types : ["filmes"];
};
