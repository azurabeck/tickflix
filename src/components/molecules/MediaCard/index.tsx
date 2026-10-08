import type { ReactNode } from "react";
import { CheckCircleIcon, PlayCircleIcon, TvIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { useTranslation } from "react-i18next";
import RatingInput from "@/components/atoms/RatingInput";
import { useMediaCards } from "@/contexts/MediaCards";
import { followedSeriesProgress } from "@/actions/helpers/followed";
import { movieKey } from "@/actions/helpers/timelines";
import { backdropCardUrl, posterUrl as resolveTmdbPosterUrl } from "@/service/TMDbSettings";
import { cardTypeOf, type MediaItem } from "@/types/media";
import "./style.scss";

interface MediaCardProps {
  item: MediaItem;
  isOpen: boolean;
  onSelect: () => void;
  onOpen?: (item: MediaItem) => void;
  badge?: ReactNode;
  subtitle?: string;
  isModal?: boolean;
}

// Card de filme (type "movie") ou série/anime (type "serie"), ligado ao estado global (useMediaCards).
const MediaCard = ({ item, isOpen, onSelect, onOpen, badge, subtitle, isModal = false }: MediaCardProps) => {
  const { t } = useTranslation();
  const media = useMediaCards();
  const type = cardTypeOf(item);
  const isSerie = type === "serie";
  const hasIdentity = item.id !== undefined && item.mediaType !== undefined;
  const key = hasIdentity ? movieKey(item.mediaType!, item.id!) : null;
  const followed = isSerie && item.id !== undefined ? media.followed.get(item.id) : undefined;
  const progress = followed ? followedSeriesProgress(followed) : undefined;
  const isChecked = media.isChecked(item);
  const rating = key ? media.ratings.get(key) ?? null : null;

  const openDetail = () => {
    if (onOpen) onOpen(item);
    else if (hasIdentity) media.openDetail({ id: item.id!, mediaType: item.mediaType! });
  };

  const showPanel = isOpen || isModal;
  const backdrop = backdropCardUrl(item.backdropPath);
  const poster = item.posterUrl ?? resolveTmdbPosterUrl(item.posterPath ?? null);
  const image = backdrop ?? poster;

  const checkLabel = t(isSerie ? (isChecked ? "card.unmarkFollowing" : "card.markFollowing") : isChecked ? "card.unmarkWatched" : "card.markWatched");
  const progressPct = progress && progress.total > 0 ? Math.round((progress.watched / progress.total) * 100) : 0;
  const progressLabel = progress ? t("card.progress", { watched: progress.watched, total: progress.total }) : "";

  return (
    <div className={["media-card", isOpen && "media-card--open", isModal && "media-card--modal"].filter(Boolean).join(" ")}>
      <button type="button" className="media-card__media" onClick={showPanel ? openDetail : onSelect} title={item.title} aria-expanded={isOpen}>
        {image ? (
          <img src={image} alt={item.title} className={backdrop ? "media-card__image" : "media-card__image media-card__image--poster-fallback"} loading="lazy" />
        ) : (
          <div className="media-card__image media-card__image--empty" />
        )}
      </button>

      {badge && <span className="media-card__badge">{badge}</span>}

      {showPanel && (
        <div className="media-card__panel">
          <h3 className="media-card__name">{item.title}</h3>
          {subtitle && <p className="media-card__subtitle">{subtitle}</p>}

          <div className={isSerie ? "media-card__row media-card__row--serie" : "media-card__row"}>
            {isSerie && (
              <div className="media-card__progress" data-tooltip={progress ? progressLabel : undefined} data-tooltip-align="start" aria-label={progress ? progressLabel : undefined}>
                {progress && (
                  <>
                    <div className="media-card__progress-bar">
                      <div className="media-card__progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="media-card__progress-text">
                      {progress.watched} / {progress.total}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="media-card__group">
              {hasIdentity && <RatingInput rating={rating} onChange={(value) => media.rate(item, value)} disabled={!media.uid || !(isSerie || isChecked)} />}
              {!hasIdentity && item.rankLabel && <span className="media-card__label">{item.rankLabel}</span>}
            </div>

            {hasIdentity && (
              <div className="media-card__group media-card__group--actions">
                {!isSerie && item.available && (
                  <span className="media-card__icon media-card__icon--static" data-tooltip={t("card.availableStreaming")} aria-label={t("card.availableStreaming")}>
                    <TvIcon />
                  </span>
                )}
                <button
                  type="button"
                  className="media-card__icon"
                  onClick={() => media.playTrailer({ id: item.id!, mediaType: item.mediaType!, title: item.title })}
                  data-tooltip={t("card.watchTrailer")}
                  aria-label={t("card.watchTrailer")}
                >
                  <PlayCircleIcon />
                </button>
                <button
                  type="button"
                  className={isChecked ? "media-card__icon media-card__icon--checked" : "media-card__icon"}
                  onClick={() => media.toggleChecked(item)}
                  disabled={!media.uid}
                  data-tooltip={checkLabel}
                  data-tooltip-side={isModal ? undefined : "right"}
                  data-tooltip-align={isModal ? "end" : undefined}
                  aria-label={checkLabel}
                  aria-pressed={isChecked}
                >
                  {isChecked ? <CheckCircleSolid /> : <CheckCircleIcon />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaCard;
