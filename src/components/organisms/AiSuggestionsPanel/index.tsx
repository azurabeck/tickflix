import { useTranslation } from "react-i18next";
import HomeSection from "@/components/atoms/HomeSection";
import SuggestionCard from "@/components/molecules/SuggestionCard";
import SuggestionRefreshCard from "@/components/atoms/SuggestionRefreshCard";
import { useDailySuggestions, type SuggestionKind } from "@/actions/helpers/aisuggestion";
import { movieKey } from "@/actions/helpers/timelines";
import "./style.scss";

interface AiSuggestionsPanelProps {
  recentKeys: string[];
  mediaKind?: SuggestionKind;
  category?: "series" | "animes";
  keyFilter?: (key: string) => boolean;
}

// Painel roxo "Sugestão da IA": 3 sugestões por dia; o que você assiste vira um botão de refresh.
const AiSuggestionsPanel = ({ recentKeys, mediaKind = "movie", category, keyFilter }: AiSuggestionsPanelProps) => {
  const { t } = useTranslation();
  const { daily, basis, generating, failed, quotaHit, refreshing, refreshFailed, refresh, retry } = useDailySuggestions({ recentKeys, mediaKind, category, keyFilter });

  const showEmptyHint = !daily && !basis;

  return (
    <HomeSection variant="purple" wide className="ai-panel">
      <h3 className="ai-panel__title">{t("dashboard.ai.title")}</h3>
      {(daily || basis) && <p className="ai-panel__basis">{t(basis === "watched" ? "dashboard.ai.basisWatched" : "dashboard.ai.basisRatings")}</p>}

      {showEmptyHint && <p className="ai-panel__message">{t("dashboard.ai.empty")}</p>}
      {!daily && basis && generating && <p className="ai-panel__message">{t("dashboard.ai.loading")}</p>}
      {!daily && basis && failed && !generating && (
        <div className="ai-panel__message">
          <p>{t(quotaHit ? "dashboard.ai.quota" : "dashboard.ai.error")}</p>
          {!quotaHit && (
            <button type="button" className="ai-panel__retry" onClick={retry}>
              {t("dashboard.ai.retry")}
            </button>
          )}
        </div>
      )}

      {daily && (
        <>
          <div className="ai-panel__posters">
            {daily.slots.map((slot, index) =>
              slot ? (
                <SuggestionCard key={movieKey(slot.mediaType, slot.id)} id={slot.id} mediaType={slot.mediaType} title={slot.title} posterPath={slot.posterPath} available={slot.available} category={category} />
              ) : (
                <SuggestionRefreshCard key={`refresh-${index}`} loading={refreshing} onRefresh={refresh} />
              )
            )}
          </div>
          {refreshFailed && <p className="ai-panel__basis">{t(quotaHit ? "dashboard.ai.quota" : "dashboard.ai.error")}</p>}
        </>
      )}
    </HomeSection>
  );
};

export default AiSuggestionsPanel;
