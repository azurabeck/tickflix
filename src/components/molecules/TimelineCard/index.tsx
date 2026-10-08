import { Clapperboard, Star, Trash2 } from "lucide-react";
import Spinner from "@/components/atoms/Spinner";
import { progressPercent, timelineMovieKey, timelineProgress, type Timeline } from "@/actions/helpers/timelines";
import { posterUrl } from "@/service/TMDbSettings";
import "./style.scss";

const PREVIEW_POSTER_COUNT = 4;

interface TimelineCardProps {
  timeline: Timeline;
  watchedMap: Map<string, number>;
  disabled: boolean;
  deleting: boolean;
  onOpen: () => void;
  onToggleFollow: () => void;
  onDelete: () => void;
}

// Card de uma timeline: pôsteres de prévia, seguir (estrela), apagar e progresso de visto.
const TimelineCard = ({ timeline, watchedMap, disabled, deleting, onOpen, onToggleFollow, onDelete }: TimelineCardProps) => {
  const { watched, total } = timelineProgress(timeline, watchedMap);
  const pct = progressPercent(watched, total);
  const previewPosters = timeline.movies.slice(0, PREVIEW_POSTER_COUNT);
  const isFollowed = Boolean(timeline.followed);
  const followLabel = isFollowed ? "Deixar de seguir" : "Seguir (aparece na página de descoberta)";

  return (
    <div className="timeline-card">
      <div className="timeline-card__posters">
        {previewPosters.length > 0 ? (
          previewPosters.map((movie) => {
            const poster = posterUrl(movie.posterPath);
            return poster ? (
              <img key={timelineMovieKey(movie)} src={poster} alt="" className="timeline-card__poster" />
            ) : (
              <div key={timelineMovieKey(movie)} className="timeline-card__poster timeline-card__poster--empty" />
            );
          })
        ) : (
          <div className="timeline-card__poster timeline-card__poster--empty">
            <Clapperboard size={20} />
          </div>
        )}

        <div className="timeline-card__scrim" />

        <div className="timeline-card__actions">
          <button
            type="button"
            className={isFollowed ? "timeline-card__follow timeline-card__follow--active" : "timeline-card__follow"}
            onClick={onToggleFollow}
            disabled={disabled}
            title={followLabel}
            aria-label={followLabel}
          >
            <Star size={15} fill={isFollowed ? "currentColor" : "none"} />
          </button>
          <button type="button" className="timeline-card__delete" onClick={onDelete} disabled={disabled || deleting} aria-label={`Apagar timeline ${timeline.name}`}>
            {deleting ? <Spinner size={14} /> : <Trash2 size={15} />}
          </button>
        </div>
      </div>

      <button type="button" className="timeline-card__open" onClick={onOpen}>
        <span className="timeline-card__name">{timeline.name}</span>
        <div className="timeline-card__progress-bar">
          <div className="timeline-card__progress-fill" style={{ width: `${pct}%` }} />
          <span className="timeline-card__progress-label">
            visto: {watched}/{total}
          </span>
        </div>
      </button>
    </div>
  );
};

export default TimelineCard;
