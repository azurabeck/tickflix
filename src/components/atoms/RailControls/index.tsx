import { useTranslation } from "react-i18next";
import { PlayIcon } from "@heroicons/react/24/solid";
import type { RailState } from "@/actions/helpers/scrollrail";
import "./style.scss";

interface RailControlsProps {
  rail: RailState;
  seeAllLabel?: string;
  onSeeAll?: () => void;
}

const RailControls = ({ rail, seeAllLabel, onSeeAll }: RailControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="rail-controls">
      <button type="button" className="rail-controls__arrow rail-controls__arrow--prev" onClick={() => rail.scrollByStep(-1)} disabled={!rail.canScrollLeft} aria-label={t("dashboard.prevItems")}>
        <PlayIcon />
      </button>
      {onSeeAll && (
        <button type="button" className="rail-controls__see-all" onClick={onSeeAll}>
          {seeAllLabel ?? t("dashboard.seeAllShort")}
        </button>
      )}
      <button type="button" className="rail-controls__arrow" onClick={() => rail.scrollByStep(1)} disabled={!rail.canScrollRight} aria-label={t("dashboard.nextItems")}>
        <PlayIcon />
      </button>
    </div>
  );
};

export default RailControls;
