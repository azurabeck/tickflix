import { useTranslation } from "react-i18next";
import HomeSection from "@/components/atoms/HomeSection";
import SuggestionCard from "@/components/molecules/SuggestionCard";
import SuggestionRefreshCard from "@/components/atoms/SuggestionRefreshCard";
import { useDailySuggestions, type SuggestionKind } from "@/actions/helpers/aisuggestion";
import { movieKey } from "@/actions/helpers/timelines";
import "./style.scss";

interface AiSuggestionsPanelProps {
  mediaKind: SuggestionKind;
  category?: "series" | "animes";
}

// Painel roxo "Sugestão da IA": 3 sugestões por dia; o que você assiste vira um botão de refresh.
const AiSuggestionsPanel = ({ mediaKind, category }: AiSuggestionsPanelProps) => {
  const { t } = useTranslation();
  const { slots, basis, noTaste, loading, failed, quotaHit, refreshing, refreshFailed, refresh, retry } = useDailySuggestions({ mediaKind, category });

  const hasSlots = slots.length > 0;

  return (
    <HomeSection variant="purple" wide className="ai-panel">
      <h3 className="ai-panel__title">{t("dashboard.ai.title")}</h3>
      {hasSlots && basis && <p className="ai-panel__basis">{t(basis === "watched" ? "dashboard.ai.basisWatched" : "dashboard.ai.basisRatings")}</p>}

      {noTaste && <p className="ai-panel__message">{t("dashboard.ai.empty")}</p>}
      {!hasSlots && loading && <p className="ai-panel__message">{t("dashboard.ai.loading")}</p>}
      {!hasSlots && failed && !loading && (
        <div className="ai-panel__message">
          <p>{t(quotaHit ? "dashboard.ai.quota" : "dashboard.ai.error")}</p>
          {!quotaHit && (
            <button type="button" className="ai-panel__retry" onClick={retry}>
              {t("dashboard.ai.retry")}
            </button>
          )}
        </div>
      )}

      {hasSlots && (
        <>
          <div className="ai-panel__posters">
            {slots.map((slot, index) =>
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
