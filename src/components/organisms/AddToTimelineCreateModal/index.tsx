import { useTranslation } from "react-i18next";
import { Check, Plus, Search, X } from "lucide-react";
import Modal from "@/components/atoms/Modal";
import Spinner from "@/components/atoms/Spinner";
import StatusMessage from "@/components/atoms/StatusMessage";
import { useCreateManually, type AddableMovie } from "@/actions/helpers/addtotimeline";
import { movieKey } from "@/actions/helpers/timelines";
import { posterUrl } from "@/service/TMDbSettings";
import "./style.scss";

interface AddToTimelineCreateModalProps {
  uid: string;
  initialMovie: AddableMovie;
  onClose: () => void;
  onSaved: () => void;
}

// Criar uma timeline nova escolhendo os títulos (o título clicado já entra).
const AddToTimelineCreateModal = ({ uid, initialMovie, onClose, onSaved }: AddToTimelineCreateModalProps) => {
  const { t } = useTranslation();
  const form = useCreateManually(uid, initialMovie, onSaved);
  const { name, setName, movies, seeding, query, setQuery, results, searching, saving, error } = form;

  return (
    <Modal onClose={onClose} size="md" title={t("addToTimeline.createModal.title")}>
      <input
        type="text"
        className="add-to-timeline-create-modal__name-input"
        placeholder={t("addToTimeline.createModal.namePlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="add-to-timeline-create-modal__search-bar">
        <input
          type="text"
          className="add-to-timeline-create-modal__search-input"
          placeholder={t("addToTimeline.createModal.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && form.search()}
        />
        <button type="button" className="add-to-timeline-create-modal__search-button" onClick={form.search} disabled={searching || !query.trim()}>
          {searching ? <Spinner size={16} /> : <Search size={16} />}
        </button>
      </div>

      {results && (
        <div className="add-to-timeline-create-modal__search-results">
          {results.length === 0 && <StatusMessage variant="empty">{t("addToTimeline.createModal.empty")}</StatusMessage>}
          {results.map((item) => {
            const poster = posterUrl(item.poster_path);
            const selected = form.isSelected(item);

            return (
              <button
                key={movieKey(item.mediaType, item.id)}
                type="button"
                className="add-to-timeline-create-modal__search-result"
                onClick={() => form.addResult(item)}
                disabled={selected}
                title={item.title}
              >
                {poster ? <img src={poster} alt={item.title} /> : <div className="add-to-timeline-create-modal__search-result-poster--empty" />}
                <span className="add-to-timeline-create-modal__search-result-icon">{selected ? <Check size={14} /> : <Plus size={14} />}</span>
              </button>
            );
          })}
        </div>
      )}

      <h3 className="add-to-timeline-create-modal__selected-title">
        {seeding ? t("addToTimeline.createModal.loading") : t("addToTimeline.createModal.selectedTitle", { count: movies.length })}
      </h3>

      <div className="add-to-timeline-create-modal__selected-grid">
        {movies.map((movie) => {
          const key = movieKey(movie.mediaType, movie.id);
          const poster = posterUrl(movie.posterPath);
          return (
            <div key={key} className="add-to-timeline-create-modal__selected-item">
              {poster ? <img src={poster} alt={movie.title} /> : <div className="add-to-timeline-create-modal__selected-item-poster--empty" />}
              <button
                type="button"
                className="add-to-timeline-create-modal__selected-remove"
                onClick={() => form.remove(key)}
                aria-label={t("addToTimeline.createModal.remove", { title: movie.title })}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {error && <StatusMessage variant="error">{error}</StatusMessage>}

      <button type="button" className="add-to-timeline-create-modal__save" onClick={form.save} disabled={saving || seeding || !name.trim() || movies.length === 0}>
        {saving ? <Spinner size={18} /> : t("addToTimeline.createModal.save", { count: movies.length })}
      </button>
    </Modal>
  );
};

export default AddToTimelineCreateModal;
