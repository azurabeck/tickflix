// src/components/addToTimelineButton/CreateTimelineModal.tsx
// Terceira peça do pedido "EU QUERO PODER CRIAR UMA TIMELINE MANUALMENTE
// TB" — não é o painel de IA por descrição (CreateTimelinePanel/
// CreateTimelineModal, home/dashboard) — aqui o usuário dá um NOME, busca
// título por título na lib do TMDb (`searchTmdbMulti`, igual o
// @/components/searchModal) e monta a lista com a própria mão. Abre a
// partir da claquete de qualquer pôster do site (@/components/
// addToTimelineButton) — já entra com ESSE filme pré-adicionado.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { createTimeline, movieKey, type TimelineMovie } from "@/service/TimelineSettings";
import { posterUrl, searchTmdbMulti, type TmdbMovie } from "@/service/TMDbSettings";
import { toTimelineMovie, typesFromMovies, type AddableMovie } from "./functions";

interface CreateTimelineModalProps {
  uid: string;
  initialMovie: AddableMovie;
  onClose: () => void;
  onSaved: () => void;
}

const CreateTimelineModal = ({ uid, initialMovie, onClose, onSaved }: CreateTimelineModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialMovie.title);
  const [movies, setMovies] = useState<TimelineMovie[]>([]);
  const [seeding, setSeeding] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovie[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abre já com o filme/série de origem (o pôster cuja claquete foi
  // clicada) — "criar nova timeline" a partir de um card não deveria
  // começar vazia.
  useEffect(() => {
    toTimelineMovie(initialMovie)
      .then((movie) => setMovies([movie]))
      .catch((err) => console.error("Erro ao resolver filme inicial da timeline:", err))
      .finally(() => setSeeding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    try {
      setResults(await searchTmdbMulti(q, 24));
    } catch (err) {
      console.error("Erro na busca:", err);
    } finally {
      setSearching(false);
    }
  };

  const isSelected = (item: { id: number; mediaType: "movie" | "tv" }) =>
    movies.some((m) => movieKey(m.mediaType, m.id) === movieKey(item.mediaType, item.id));

  const handleAddResult = (item: TmdbMovie) => {
    if (isSelected(item)) return;
    setMovies((prev) => [
      ...prev,
      { id: item.id, mediaType: item.mediaType, title: item.title, year: item.year, posterPath: item.poster_path, watched: false, watchedAt: null },
    ]);
  };

  const handleRemove = (key: string) => {
    setMovies((prev) => prev.filter((m) => movieKey(m.mediaType, m.id) !== key));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || movies.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      // followed=true — mesmo padrão do painel de IA (CreateTimelineModal,
      // home/dashboard): timeline nova já entra seguida, aparece direto na
      // Home sem precisar ir marcar a estrela na página Timelines.
      await createTimeline(uid, trimmedName, typesFromMovies(movies), movies, { followed: true });
      onSaved();
    } catch (err) {
      console.error("Erro ao criar timeline manualmente:", err);
      setError(t("addToTimeline.createModal.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-to-timeline-modal__overlay" onClick={onClose}>
      <div className="add-to-timeline-modal__panel add-to-timeline-modal__panel--create" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="add-to-timeline-modal__close" onClick={onClose} aria-label={t("close")}>
          <X size={20} />
        </button>

        <h2 className="add-to-timeline-modal__title">{t("addToTimeline.createModal.title")}</h2>

        <input
          type="text"
          className="add-to-timeline-modal__name-input"
          placeholder={t("addToTimeline.createModal.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="add-to-timeline-modal__search-bar">
          <input
            type="text"
            className="add-to-timeline-modal__search-input"
            placeholder={t("addToTimeline.createModal.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button type="button" className="add-to-timeline-modal__search-button" onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="add-to-timeline-modal__spinner" size={16} /> : <Search size={16} />}
          </button>
        </div>

        {results && (
          <div className="add-to-timeline-modal__search-results">
            {results.length === 0 && <p className="add-to-timeline-modal__empty">{t("addToTimeline.createModal.empty")}</p>}
            {results.map((item) => {
              const poster = posterUrl(item.poster_path);
              const selected = isSelected(item);

              return (
                <button
                  key={movieKey(item.mediaType, item.id)}
                  type="button"
                  className="add-to-timeline-modal__search-result"
                  onClick={() => handleAddResult(item)}
                  disabled={selected}
                  title={item.title}
                >
                  {poster ? <img src={poster} alt={item.title} /> : <div className="add-to-timeline-modal__search-result-poster--empty" />}
                  <span className="add-to-timeline-modal__search-result-icon">{selected ? <Check size={14} /> : <Plus size={14} />}</span>
                </button>
              );
            })}
          </div>
        )}

        <h3 className="add-to-timeline-modal__selected-title">
          {seeding ? t("addToTimeline.createModal.loading") : t("addToTimeline.createModal.selectedTitle", { count: movies.length })}
        </h3>

        <div className="add-to-timeline-modal__selected-grid">
          {movies.map((movie) => {
            const key = movieKey(movie.mediaType, movie.id);
            const poster = posterUrl(movie.posterPath);
            return (
              <div key={key} className="add-to-timeline-modal__selected-item">
                {poster ? <img src={poster} alt={movie.title} /> : <div className="add-to-timeline-modal__selected-item-poster--empty" />}
                <button
                  type="button"
                  className="add-to-timeline-modal__selected-remove"
                  onClick={() => handleRemove(key)}
                  aria-label={t("addToTimeline.createModal.remove", { title: movie.title })}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {error && <p className="add-to-timeline-modal__error">{error}</p>}

        <button
          type="button"
          className="add-to-timeline-modal__save"
          onClick={handleSave}
          disabled={saving || seeding || !name.trim() || movies.length === 0}
        >
          {saving ? <Loader2 className="add-to-timeline-modal__spinner" size={18} /> : t("addToTimeline.createModal.save", { count: movies.length })}
        </button>
      </div>
    </div>
  );
};

export default CreateTimelineModal;
