import { useMemo } from "react";
import type { AnimesDashboard } from "@/actions/animes/dashboard";
import type { DashboardMovie } from "@/types/media";

// Section "Mais vistos em <ano>" (Rank): pega a fatia "top" do dashboard (com o loading dela) e marca a categoria dos cards.
// usado em: página Animes
export const useAnimesMostWatchedRank = (dashboard: AnimesDashboard) => {
  const top = dashboard.section<DashboardMovie>("top");
  const items = useMemo(() => top.items?.map((item) => ({ ...item, mediaType: "tv" as const, category: "animes" as const })) ?? null, [top.items]);
  return { ...top, items };
};
