// src/components/suggestionCard/SuggestionRefreshCard.tsx
// Ocupa o lugar de uma sugestão que o usuário já assistiu: mesmo tamanho do
// card de sugestão, com um botão de refresh no meio. Clicar pede novas
// sugestões (ver AiSuggestionsPanel.tsx).
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import "./styles.scss";

interface SuggestionRefreshCardProps {
  loading?: boolean;
  onRefresh: () => void;
}

const SuggestionRefreshCard = ({ loading = false, onRefresh }: SuggestionRefreshCardProps) => {
  const { t } = useTranslation();
  const label = t(loading ? "dashboard.ai.refreshing" : "dashboard.ai.refresh");

  return (
    <div className="suggestion-card suggestion-card--refresh">
      <button type="button" className="suggestion-card__refresh" onClick={onRefresh} disabled={loading} data-tooltip={label} aria-label={label}>
        <ArrowPathIcon className={loading ? "suggestion-card__refresh-icon suggestion-card__refresh-icon--spinning" : "suggestion-card__refresh-icon"} />
      </button>
    </div>
  );
};

export default SuggestionRefreshCard;
