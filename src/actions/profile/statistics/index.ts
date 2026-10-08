import { useEffect, useState } from "react";
import { tmdbFetch } from "@/service/TMDbSettings";
import { fetchWatched } from "@/actions/helpers/watched";

interface WatchedStats {
  movies: number;
  series: number;
  animes: number;
}

interface RawTvGenreCheck {
  genre_ids?: number[];
  genres?: { id: number }[];
  original_language?: string;
  origin_country?: string[];
}

const ANIME_GENRE_ID = 16;

const isAnimeTv = (data: RawTvGenreCheck): boolean => {
  const genreIds = data.genres?.map((g) => g.id) ?? data.genre_ids ?? [];
  return genreIds.includes(ANIME_GENRE_ID) && (data.original_language === "ja" || (data.origin_country ?? []).includes("JP"));
};

const fetchWatchedStats = async (uid: string): Promise<WatchedStats> => {
  const watched = (await fetchWatched(uid)).filter((t) => t.watchedAt !== undefined);
  const movieIds: number[] = [];
  const tvIds: number[] = [];

  for (const { id, mediaType } of watched) (mediaType === "movie" ? movieIds : tvIds).push(id);

  const tvResults = await Promise.allSettled(tvIds.map((id) => tmdbFetch<RawTvGenreCheck>(`/tv/${id}`)));

  let series = 0;
  let animes = 0;
  for (const result of tvResults) {
    if (result.status === "fulfilled" && isAnimeTv(result.value)) animes++;
    else series++;
  }

  return { movies: movieIds.length, series, animes };
};

// Ciclo "estatísticas do perfil": conta o que já foi visto (filmes / séries / animes).
// usado em: ProfileStats
export const useStatistics = (uid: string | undefined) => {
  const [stats, setStats] = useState<WatchedStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) return;
    fetchWatchedStats(uid)
      .then(setStats)
      .catch((err) => {
        console.error("Erro ao buscar estatísticas de já vi:", err);
        setError(true);
      });
  }, [uid]);

  return { stats, error };
};
