import { useMemo } from "react";
import type { SeriesDashboard } from "@/actions/series/dashboard";
import type { DashboardMovie } from "@/types/media";

// Section "Mais vistas em <ano>" (Rank): pega a fatia "top" do dashboard (com o loading dela) e marca a categoria dos cards.
// usado em: página Séries
export const useSeriesMostWatchedRank = (dashboard: SeriesDashboard) => {
  const top = dashboard.section<DashboardMovie>("top");
  const items = useMemo(() => top.items?.map((item) => ({ ...item, mediaType: "tv" as const, category: "series" as const })) ?? null, [top.items]);
  return { ...top, items };
};
