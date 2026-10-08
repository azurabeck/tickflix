import { CheckCircleIcon, PlayCircleIcon, TvIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { useTranslation } from "react-i18next";
import AddToTimelineButton from "@/components/organisms/AddToTimelineButton";
import { useMediaCards } from "@/contexts/MediaCards";
import { posterUrl as resolvePosterUrl } from "@/service/TMDbSettings";
import { cardTypeOf } from "@/types/media";
import "./style.scss";

interface SuggestionCardProps {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  available?: boolean;
  category?: "series" | "animes";
}

// Card de sugestão (pôster com degradê e ações), ligado ao estado global (useMediaCards).
const SuggestionCard = ({ id, mediaType, title, posterPath, available, category }: SuggestionCardProps) => {
  const { t } = useTranslation();
  const media = useMediaCards();
  const isSerie = cardTypeOf({ mediaType }) === "serie";
  const isChecked = media.isChecked({ id, mediaType });
  const poster = resolvePosterUrl(posterPath);
  const checkLabel = t(isSerie ? (isChecked ? "card.unmarkFollowing" : "card.markFollowing") : isChecked ? "card.unmarkWatched" : "card.markWatched");

  return (
    <div className="suggestion-card">
      <button type="button" className="suggestion-card__open" onClick={() => media.openDetail({ id, mediaType })} title={title}>
        {poster ? <img src={poster} alt={title} className="suggestion-card__image" /> : <span className="suggestion-card__empty">{title}</span>}
      </button>

      <div className="suggestion-card__bar">
        <div className="suggestion-card__group">
          {available && (
            <span className="suggestion-card__icon suggestion-card__icon--static" data-tooltip={t("card.availableStreaming")} data-tooltip-align="start" aria-label={t("card.availableStreaming")}>
              <TvIcon />
            </span>
          )}
        </div>

        <div className="suggestion-card__group">
          <AddToTimelineButton uid={media.uid} movie={{ id, mediaType, title, posterPath }} />
          <button type="button" className="suggestion-card__icon" onClick={() => media.playTrailer({ id, mediaType, title })} data-tooltip={t("card.watchTrailer")} aria-label={t("card.watchTrailer")}>
            <PlayCircleIcon />
          </button>
          <button
            type="button"
            className={isChecked ? "suggestion-card__icon suggestion-card__icon--checked" : "suggestion-card__icon"}
            onClick={() => media.toggleChecked({ id, mediaType, title, posterPath, available, category })}
            disabled={!media.uid}
            data-tooltip={checkLabel}
            data-tooltip-align="end"
            aria-label={checkLabel}
            aria-pressed={isChecked}
          >
            {isChecked ? <CheckCircleSolid /> : <CheckCircleIcon />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestionCard;
