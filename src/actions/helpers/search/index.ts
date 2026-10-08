import { useState } from "react";
import { searchTitles, type TmdbMovie } from "@/service/TMDbSettings";
import { fetchAvailabilityMap } from "@/actions/helpers/moviedetail";
import { movieKey } from "@/actions/helpers/timelines";
import type { MediaItem } from "@/types/media";

const SEARCH_LIMIT = 24;

// Busca global (lupa da barra): escrever -> buscar filmes e séries/animes no TMDb -> entregar cards.
// usado no modal de busca do AppNav.
export const useSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(TmdbMovie & { available: boolean })[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const text = query.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    try {
      const found = await searchTitles(text, SEARCH_LIMIT);
      const availability = await fetchAvailabilityMap(found);
      setResults(found.map((movie) => ({ ...movie, available: availability.has(movieKey(movie.mediaType, movie.id)) })));
    } catch (err) {
      console.error("Erro na busca:", err);
      setError("Não foi possível buscar agora.");
    } finally {
      setLoading(false);
    }
  };

  const items: MediaItem[] | null = results && results.map((movie) => ({ id: movie.id, mediaType: movie.mediaType, title: movie.title, posterPath: movie.poster_path, year: movie.year, available: movie.available }));

  return { query, setQuery, items, loading, error, search };
};
