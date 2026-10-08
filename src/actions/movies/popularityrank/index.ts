import { useTranslation } from "react-i18next";
import type { PageDashboard } from "@/actions/helpers/section";
import type { DashboardMovie } from "@/types/media";

// Section Rank, bloco "Popularidade": pega a fatia "boxoffice" do dashboard (com o loading dela).
// usado em: página Filmes
export const usePopularityRank = (dashboard: PageDashboard) => {
  const { t } = useTranslation();
  return dashboard.section<DashboardMovie>("boxoffice", t("dashboard.errors.boxOffice"));
};
