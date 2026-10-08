import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleIcon, TrophyIcon, TvIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import RatingInput from "@/components/atoms/RatingInput";
import type { RankItem } from "@/types/media";
import "./style.scss";

interface RankComponentProps {
  title: ReactNode;
  items: RankItem[];
  sizes?: [number, number];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  disabled?: boolean;
  onOpen: (item: RankItem) => void;
  onToggleChecked: (item: RankItem) => void;
  onRate: (item: RankItem, rating: number | null) => void;
}

const RankComponent = ({ title, items, sizes = [10, 20], loading, error, emptyMessage, disabled, onOpen, onToggleChecked, onRate }: RankComponentProps) => {
  const { t } = useTranslation();
  const [short, long] = sizes;
  const [expanded, setExpanded] = useState(false);

  const visible = items.slice(0, expanded ? long : short);
  const [first, ...rest] = visible;

  const renderControls = (item: RankItem) => {
    const isSerie = item.type === "serie";
    const checkLabel = t(isSerie ? (item.checked ? "card.unmarkFollowing" : "card.markFollowing") : item.checked ? "card.unmarkWatched" : "card.markWatched");

    return (
      <>
        <span className="rank__slot">
          {item.available && (
            <span className="rank__icon rank__icon--static" data-tooltip={t("card.availableStreaming")} data-tooltip-align="end" aria-label={t("card.availableStreaming")}>
              <TvIcon />
            </span>
          )}
        </span>
        <RatingInput rating={item.rating} onChange={(rating) => onRate(item, rating)} disabled={disabled || !(isSerie || item.checked)} />
        <button
          type="button"
          className={item.checked ? "rank__icon rank__icon--watched" : "rank__icon"}
          onClick={() => onToggleChecked(item)}
          disabled={disabled}
          data-tooltip={checkLabel}
          data-tooltip-align="end"
          aria-label={checkLabel}
          aria-pressed={item.checked}
        >
          {item.checked ? <CheckCircleSolid /> : <CheckCircleIcon />}
        </button>
      </>
    );
  };

  return (
    <section className="rank">
      <h3 className="rank__title">{title}</h3>

      <div className="rank__toggle">
        <span className="rank__toggle-label">{t("rank.top", { count: expanded ? long : short })}</span>
        <button type="button" className="rank__toggle-button" onClick={() => setExpanded((prev) => !prev)} aria-pressed={expanded}>
          {t("rank.seeTop", { count: expanded ? short : long })}
        </button>
      </div>

      {loading && <p className="rank__message">{t("dashboard.loading")}</p>}
      {error && <p className="rank__message rank__message--error">{error}</p>}
      {!loading && !error && items.length === 0 && emptyMessage && <p className="rank__message">{emptyMessage}</p>}

      {first && (
        <div className="rank__first">
          <span className="rank__lead">
            <TrophyIcon className="rank__trophy" />
          </span>
          <button type="button" className="rank__name" onClick={() => onOpen(first)} title={first.title}>
            1. {first.title}
          </button>
          {renderControls(first)}
        </div>
      )}

      {rest.length > 0 && (
        <ol className="rank__rest">
          {rest.map((item, index) => (
            <li key={item.key} className="rank__row">
              <span className="rank__lead">
                <span className="rank__bullet" />
              </span>
              <button type="button" className="rank__name" onClick={() => onOpen(item)} title={item.title}>
                {index + 2}. {item.title}
              </button>
              {renderControls(item)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default RankComponent;
