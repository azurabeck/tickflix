import type { SeriesDashboard } from "@/actions/series/dashboard";
import type { Section } from "@/actions/helpers/section";
import { toPopularityItems, useToRankItem } from "@/actions/helpers/rank";
import type { DashboardMovie, RankItem } from "@/types/media";

// Section "Mais vistas em <ano>" (Rank, backend): pega a fatia "top" do dashboard (com o loading dela), marca a categoria dos cards e junta a nota do usuário.
// usado em: página Séries
export const useSeriesMostWatchedRank = (dashboard: SeriesDashboard): Section<RankItem> => {
  const toRankItem = useToRankItem();
  const top = dashboard.section<DashboardMovie>("top");
  const cards = top.items?.map((item) => ({ ...item, mediaType: "tv" as const, category: "series" as const })) ?? null;
  return { ...top, items: toPopularityItems(cards, toRankItem) };
};
