import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createTimeline, fetchTimelines, movieKey, updateTimelineMovies, type ContentType, type Timeline, type TimelineMovie } from "@/actions/helpers/timelines";
import { fetchTitleById, searchTitles, type TmdbMovie } from "@/service/TMDbSettings";

export interface AddableMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
}

// Título pronto para entrar numa timeline (busca o ano no TMDb).
const toTimelineMovie = async (movie: AddableMovie): Promise<TimelineMovie> => ({
  id: movie.id,
  mediaType: movie.mediaType,
  title: movie.title,
  year: (await fetchTitleById(movie.mediaType, movie.id))?.year ?? "",
  posterPath: movie.posterPath,
  watched: false,
  watchedAt: null,
});

// Ciclo "adicionar a uma timeline existente": listar as timelines do usuário -> escolher uma -> gravar (ignora se o título já estava nela).
// usado no modal "adicionar a uma timeline existente" (botão + dos cards de sugestão).
export const useAddToExisting = (uid: string, movie: AddableMovie) => {
  const { t } = useTranslation();
  const [timelines, setTimelines] = useState<Timeline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelines(uid)
      .then(setTimelines)
      .catch((err) => {
        console.error("Erro ao buscar timelines:", err);
        setError(t("addToTimeline.existingModal.loadError"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const add = async (timeline: Timeline) => {
    if (addingId) return;
    setAddingId(timeline.id);
    setError(null);
    try {
      const alreadyThere = timeline.movies.some((m) => movieKey(m.mediaType, m.id) === movieKey(movie.mediaType, movie.id));
      if (!alreadyThere) {
        const movies = [...timeline.movies, await toTimelineMovie(movie)];
        await updateTimelineMovies(uid, timeline.id, movies);
        setTimelines((prev) => prev?.map((item) => (item.id === timeline.id ? { ...item, movies } : item)) ?? prev);
      }
      setAddedId(timeline.id);
    } catch (err) {
      console.error("Erro ao adicionar à timeline:", err);
      setError(t("addToTimeline.existingModal.addError"));
    } finally {
      setAddingId(null);
    }
  };

  return { timelines, error, addingId, addedId, add };
};

// Ciclo "criar timeline manualmente": nome -> buscar e escolher títulos -> salvar (a timeline nasce seguida).
// usado no modal "criar nova timeline" (botão + dos cards de sugestão).
export const useCreateManually = (uid: string, initialMovie: AddableMovie, onSaved: () => void) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialMovie.title);
  const [movies, setMovies] = useState<TimelineMovie[]>([]);
  const [seeding, setSeeding] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovie[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    toTimelineMovie(initialMovie)
      .then((movie) => setMovies([movie]))
      .catch((err) => console.error("Erro ao resolver filme inicial da timeline:", err))
      .finally(() => setSeeding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    const text = query.trim();
    if (!text || searching) return;
    setSearching(true);
    try {
      setResults(await searchTitles(text, 24));
    } catch (err) {
      console.error("Erro na busca:", err);
    } finally {
      setSearching(false);
    }
  };

  const isSelected = (item: { id: number; mediaType: "movie" | "tv" }) => movies.some((m) => movieKey(m.mediaType, m.id) === movieKey(item.mediaType, item.id));

  const addResult = (item: TmdbMovie) => {
    if (isSelected(item)) return;
    setMovies((prev) => [...prev, { id: item.id, mediaType: item.mediaType, title: item.title, year: item.year, posterPath: item.poster_path, watched: false, watchedAt: null }]);
  };

  const remove = (key: string) => setMovies((prev) => prev.filter((m) => movieKey(m.mediaType, m.id) !== key));

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || movies.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const types: ContentType[] = [...(movies.some((m) => m.mediaType === "movie") ? (["filmes"] as const) : []), ...(movies.some((m) => m.mediaType === "tv") ? (["series"] as const) : [])];
      await createTimeline(uid, trimmed, types.length > 0 ? types : ["filmes"], movies, { followed: true });
      onSaved();
    } catch (err) {
      console.error("Erro ao criar timeline manualmente:", err);
      setError(t("addToTimeline.createModal.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return { name, setName, movies, seeding, query, setQuery, results, searching, saving, error, search, isSelected, addResult, remove, save };
};
