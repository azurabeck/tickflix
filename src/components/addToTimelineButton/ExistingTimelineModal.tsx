// src/components/addToTimelineButton/ExistingTimelineModal.tsx
// Segunda opção do menu da claquete ("adicionar a timeline existente") —
// lista TODAS as timelines do usuário (qualquer categoria, sem filtro por
// tipo — mesma simplicidade já aceita pela timeline de franquia, que
// mistura filme/série numa só), clicar numa adiciona o filme/série nela.
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { fetchTimelines, movieKey, updateTimelineMovies, type Timeline } from "@/service/TimelineSettings";
import { posterUrl } from "@/service/TMDbSettings";
import { toTimelineMovie, type AddableMovie } from "./functions";

interface ExistingTimelineModalProps {
  uid: string;
  movie: AddableMovie;
  onClose: () => void;
}

const ExistingTimelineModal = ({ uid, movie, onClose }: ExistingTimelineModalProps) => {
  const [timelines, setTimelines] = useState<Timeline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelines(uid)
      .then(setTimelines)
      .catch((err) => {
        console.error("Erro ao buscar timelines:", err);
        setError("Não foi possível carregar suas timelines agora.");
      });
  }, [uid]);

  const handleAdd = async (timeline: Timeline) => {
    if (addingId) return;
    const key = movieKey(movie.mediaType, movie.id);

    // Já está nessa timeline — só confirma visualmente, não duplica.
    if (timeline.movies.some((m) => movieKey(m.mediaType, m.id) === key)) {
      setAddedId(timeline.id);
      return;
    }

    setAddingId(timeline.id);
    setError(null);
    try {
      const newMovie = await toTimelineMovie(movie);
      const nextMovies = [...timeline.movies, newMovie];
      await updateTimelineMovies(uid, timeline.id, nextMovies);
      setTimelines((prev) => prev?.map((t) => (t.id === timeline.id ? { ...t, movies: nextMovies } : t)) ?? prev);
      setAddedId(timeline.id);
    } catch (err) {
      console.error("Erro ao adicionar à timeline:", err);
      setError("Não foi possível adicionar esse título agora.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="add-to-timeline-modal__overlay" onClick={onClose}>
      <div className="add-to-timeline-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="add-to-timeline-modal__close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <h2 className="add-to-timeline-modal__title">Adicionar "{movie.title}" a uma timeline</h2>

        {error && <p className="add-to-timeline-modal__error">{error}</p>}

        {!timelines && !error && (
          <p className="add-to-timeline-modal__loading">
            <Loader2 className="add-to-timeline-modal__spinner" size={16} />
            Carregando...
          </p>
        )}

        {timelines && timelines.length === 0 && (
          <p className="add-to-timeline-modal__empty">Você ainda não tem nenhuma timeline — crie uma nova.</p>
        )}

        {timelines && timelines.length > 0 && (
          <div className="add-to-timeline-modal__list">
            {timelines.map((timeline) => {
              const poster = posterUrl(timeline.movies[0]?.posterPath ?? null);
              const isAdding = addingId === timeline.id;
              const isAdded = addedId === timeline.id;

              return (
                <button
                  key={timeline.id}
                  type="button"
                  className="add-to-timeline-modal__list-item"
                  onClick={() => handleAdd(timeline)}
                  disabled={isAdding}
                >
                  {poster ? (
                    <img src={poster} alt="" className="add-to-timeline-modal__list-poster" />
                  ) : (
                    <div className="add-to-timeline-modal__list-poster add-to-timeline-modal__list-poster--empty" />
                  )}
                  <span className="add-to-timeline-modal__list-name">{timeline.name}</span>
                  <span className="add-to-timeline-modal__list-status">
                    {isAdding ? (
                      <Loader2 className="add-to-timeline-modal__spinner" size={14} />
                    ) : isAdded ? (
                      "Adicionado ✓"
                    ) : (
                      `${timeline.movies.length} título${timeline.movies.length === 1 ? "" : "s"}`
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExistingTimelineModal;
