import { useTranslation } from "react-i18next";
import type { PageDashboard, Section } from "@/actions/helpers/section";
import { toPopularityItems, useToRankItem } from "@/actions/helpers/rank";
import type { DashboardMovie, RankItem } from "@/types/media";

// Section "Popularidade" (Rank, backend): pega a fatia "boxoffice" do dashboard (com o loading dela) e junta a nota do usuário em cada card.
// usado em: página Filmes
export const usePopularityRank = (dashboard: PageDashboard): Section<RankItem> => {
  const { t } = useTranslation();
  const toRankItem = useToRankItem();
  const boxOffice = dashboard.section<DashboardMovie>("boxoffice", t("dashboard.errors.boxOffice"));
  return { ...boxOffice, items: toPopularityItems(boxOffice.items, toRankItem) };
};
