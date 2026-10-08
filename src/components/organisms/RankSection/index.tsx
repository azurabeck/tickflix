import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import HomeRow from "@/components/atoms/HomeRow";
import HomeSection from "@/components/atoms/HomeSection";
import AiSuggestionsPanel from "@/components/organisms/AiSuggestionsPanel";
import RankComponent from "@/components/molecules/RankComponent";
import { useRankHandlers, type MyNotes } from "@/actions/helpers/rank";
import type { Section } from "@/actions/helpers/section";
import type { SuggestionKind } from "@/actions/helpers/aisuggestion";
import type { RankItem } from "@/types/media";

interface RankSectionProps {
  mediaKind?: SuggestionKind;
  category?: "series" | "animes";
  popularityTitle: ReactNode;
  popularity: Section<RankItem>;
  myNotes: MyNotes;
}

// Linha com três blocos: ranking popular (backend), "Seu Rank de Notas" (Firebase) e a sugestão da IA. Só mostra o que as sections entregam.
const RankSection = ({ mediaKind = "movie", category, popularityTitle, popularity, myNotes }: RankSectionProps) => {
  const { t } = useTranslation();
  const handlers = useRankHandlers(category);

  const emptyKey = category === "animes" ? "dashboard.rank.yoursEmptyAnime" : mediaKind === "tv" ? "dashboard.rank.yoursEmptyTv" : "dashboard.rank.yoursEmpty";

  return (
    <HomeRow columns="1fr 1fr 2fr">
      <HomeSection gapAfter>
        <RankComponent title={popularityTitle} items={popularity.items ?? []} loading={popularity.loading} error={popularity.error} {...handlers} />
      </HomeSection>
      <HomeSection>
        <RankComponent
          title={
            <>
              {t("dashboard.rank.yoursLabel")} <strong>{t("dashboard.rank.yoursStrong")}</strong>
            </>
          }
          items={myNotes.items}
          loading={myNotes.loading}
          emptyMessage={t(emptyKey)}
          {...handlers}
        />
      </HomeSection>
      <AiSuggestionsPanel recentKeys={myNotes.recentKeys} mediaKind={mediaKind} category={category} keyFilter={myNotes.keyFilter} />
    </HomeRow>
  );
};

export default RankSection;
