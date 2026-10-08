import { useTranslation } from "react-i18next";
import Modal from "@/components/atoms/Modal";
import Spinner from "@/components/atoms/Spinner";
import StatusMessage from "@/components/atoms/StatusMessage";
import { useAddToExisting, type AddableMovie } from "@/actions/helpers/addtotimeline";
import { posterUrl } from "@/service/TMDbSettings";
import "./style.scss";

interface AddToTimelineExistingModalProps {
  uid: string;
  movie: AddableMovie;
  onClose: () => void;
}

// Escolher uma timeline existente para receber o título.
const AddToTimelineExistingModal = ({ uid, movie, onClose }: AddToTimelineExistingModalProps) => {
  const { t } = useTranslation();
  const { timelines, error, addingId, addedId, add } = useAddToExisting(uid, movie);

  return (
    <Modal onClose={onClose} size="sm" title={t("addToTimeline.existingModal.title", { title: movie.title })}>
      {error && <StatusMessage variant="error">{error}</StatusMessage>}
      {!timelines && !error && (
        <StatusMessage variant="loading" spinner>
          {t("addToTimeline.createModal.loading")}
        </StatusMessage>
      )}
      {timelines && timelines.length === 0 && <StatusMessage variant="empty">{t("addToTimeline.existingModal.empty")}</StatusMessage>}

      {timelines && timelines.length > 0 && (
        <div className="add-to-timeline-existing-modal__list">
          {timelines.map((timeline) => {
            const poster = posterUrl(timeline.movies[0]?.posterPath ?? null);
            const isAdding = addingId === timeline.id;
            const isAdded = addedId === timeline.id;

            return (
              <button key={timeline.id} type="button" className="add-to-timeline-existing-modal__list-item" onClick={() => add(timeline)} disabled={isAdding}>
                {poster ? (
                  <img src={poster} alt="" className="add-to-timeline-existing-modal__list-poster" />
                ) : (
                  <div className="add-to-timeline-existing-modal__list-poster add-to-timeline-existing-modal__list-poster--empty" />
                )}
                <span className="add-to-timeline-existing-modal__list-name">{timeline.name}</span>
                <span className="add-to-timeline-existing-modal__list-status">
                  {isAdding ? <Spinner size={14} /> : isAdded ? t("addToTimeline.existingModal.added") : t("addToTimeline.existingModal.titleCount", { count: timeline.movies.length })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default AddToTimelineExistingModal;
