import { createTimeline, fetchTimelineByAwardEdition, updateTimelineMovies, type TimelineMovie } from "@/actions/helpers/timelines";
import type { AwardConfig, AwardEdition } from "@/actions/awards/editions";

const editionTimelineName = (config: AwardConfig, edition: AwardEdition): string => `${edition.ordinal}ª ${config.editionNoun}`;

const collectEditionMovies = (edition: AwardEdition): TimelineMovie[] => {
  const byId = new Map<number, TimelineMovie>();

  for (const category of edition.categories ?? []) {
    for (const nominee of category.nominees) {
      if (!nominee.tmdbId || byId.has(nominee.tmdbId)) continue;

      byId.set(nominee.tmdbId, {
        id: nominee.tmdbId,
        mediaType: nominee.mediaType,
        title: nominee.filmTitle,
        year: String(nominee.filmYear),
        posterPath: nominee.posterPath,
        watched: false,
        watchedAt: null,
      });
    }
  }

  return Array.from(byId.values());
};

// Mantém a timeline da edição em dia: cria ou atualiza com os filmes indicados.
// usado em: awards/dashboard
export const syncAwardTimeline = async (uid: string, config: AwardConfig, edition: AwardEdition): Promise<void> => {
  const movies = collectEditionMovies(edition);
  if (movies.length === 0) return;

  const existing = await fetchTimelineByAwardEdition(uid, config.slug, edition.ordinal);
  if (existing) {
    await updateTimelineMovies(uid, existing.id, movies);
  } else {
    await createTimeline(uid, editionTimelineName(config, edition), ["filmes"], movies, {
      awardSlug: config.slug,
      awardEditionOrdinal: edition.ordinal,
    });
  }
};
