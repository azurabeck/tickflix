// src/pages/private/awards/timelineSync.ts
// Marcar "já vi" num filme indicado a uma premiação também reflete numa
// timeline de verdade do usuário — mesmo comportamento que já existia só
// pro Oscar (pages/private/oscar/timelineSync.ts), generalizado pra
// funcionar com qualquer uma das 3 (Oscar/Globo de Ouro/Cannes) via
// `AwardConfig`. Uma timeline por (prêmio, edição) — achada por
// `awardSlug` + `awardEditionOrdinal` (service/TimelineSettings.ts), não
// por nome — com TODOS os indicados únicos daquela edição (um filme
// indicado em 2+ categorias entra uma vez só).
//
// Não precisa saber QUAIS filmes estão vistos pra montar a timeline —
// "visto" é estado GLOBAL por filme (service/WatchedSettings.ts), não
// mais um campo gravado dentro do próprio doc da timeline. Só funciona
// pra indicado com `tmdbId` real (preenchido por quem cadastrou, ver
// AddDataModal.tsx) — sem isso não dá pra representar como TimelineMovie
// de verdade.
import { createTimeline, fetchTimelineByAwardEdition, updateTimelineMovies, type TimelineMovie } from "@/service/TimelineSettings";
import type { AwardConfig } from "./awardConfigs";
import type { AwardEdition } from "./functions";

const editionTimelineName = (config: AwardConfig, edition: AwardEdition): string => `${edition.ordinal}ª ${config.editionNoun}`;

// Todos os indicados únicos da edição (por tmdbId, através de todas as
// categorias).
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
        // Inertes de propósito — "visto" é lido do estado global
        // (WatchedSettings.ts) por timelineMovieKey, nunca daqui.
        watched: false,
        watchedAt: null,
      });
    }
  }

  return Array.from(byId.values());
};

export const syncAwardTimeline = async (uid: string, config: AwardConfig, edition: AwardEdition): Promise<void> => {
  const movies = collectEditionMovies(edition);
  if (movies.length === 0) return; // nada com tmdbId real ainda (edição só com dado estático)

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
