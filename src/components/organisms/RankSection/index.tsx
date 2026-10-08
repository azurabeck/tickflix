import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import HomeRow from "@/components/atoms/HomeRow";
import HomeSection from "@/components/atoms/HomeSection";
import AiSuggestionsPanel from "@/components/organisms/AiSuggestionsPanel";
import RankComponent from "@/components/molecules/RankComponent";
import { useRank } from "@/actions/helpers/rank";
import type { SuggestionKind } from "@/actions/helpers/aisuggestion";
import type { DashboardMovie } from "@/types/media";

interface RankSectionProps {
  mediaKind?: SuggestionKind;
  category?: "series" | "animes";
  keyFilter?: (key: string) => boolean;
  popularityTitle: ReactNode;
  popularity: DashboardMovie[] | null;
  popularityLoading?: boolean;
  popularityError: string | null;
  recentKeys: string[];
}

// Linha com três blocos: ranking popular, "Seu Rank de Notas" e a sugestão da IA.
const RankSection = ({ mediaKind = "movie", category, keyFilter, popularityTitle, popularity, popularityLoading, popularityError, recentKeys }: RankSectionProps) => {
  const { t } = useTranslation();
  const { popularityItems, yourItems, handlers } = useRank({ mediaKind, category, keyFilter, popularity });

  const emptyKey = category === "animes" ? "dashboard.rank.yoursEmptyAnime" : mediaKind === "tv" ? "dashboard.rank.yoursEmptyTv" : "dashboard.rank.yoursEmpty";

  return (
    <HomeRow columns="1fr 1fr 2fr">
      <HomeSection gapAfter>
        <RankComponent title={popularityTitle} items={popularityItems} loading={popularityLoading ?? (popularity === null && !popularityError)} error={popularityError} {...handlers} />
      </HomeSection>
      <HomeSection>
        <RankComponent
          title={
            <>
              {t("dashboard.rank.yoursLabel")} <strong>{t("dashboard.rank.yoursStrong")}</strong>
            </>
          }
          items={yourItems}
          emptyMessage={t(emptyKey)}
          {...handlers}
        />
      </HomeSection>
      <AiSuggestionsPanel recentKeys={recentKeys} mediaKind={mediaKind} category={category} keyFilter={keyFilter} />
    </HomeRow>
  );
};

export default RankSection;
