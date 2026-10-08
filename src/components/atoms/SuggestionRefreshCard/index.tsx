import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import "./style.scss";

interface SuggestionRefreshCardProps {
  loading?: boolean;
  onRefresh: () => void;
}

const SuggestionRefreshCard = ({ loading = false, onRefresh }: SuggestionRefreshCardProps) => {
  const { t } = useTranslation();
  const label = t(loading ? "dashboard.ai.refreshing" : "dashboard.ai.refresh");

  return (
    <div className="suggestion-refresh-card">
      <button type="button" className="suggestion-refresh-card__button" onClick={onRefresh} disabled={loading} data-tooltip={label} aria-label={label}>
        <ArrowPathIcon className={loading ? "suggestion-refresh-card__icon suggestion-refresh-card__icon--spinning" : "suggestion-refresh-card__icon"} />
      </button>
    </div>
  );
};

export default SuggestionRefreshCard;
