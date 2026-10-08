import { useMemo } from "react";
import type { SeriesDashboard } from "@/actions/series/dashboard";
import type { MediaItem } from "@/types/media";

// Section "Melhor avaliadas no <streaming>" (uma por streaming): pega a fatia `provider-<id>` do dashboard (com o loading dela) e marca a categoria dos cards.
// usado em: página Séries
export const useSeriesBestRatedOn = (dashboard: SeriesDashboard, providerId: number) => {
  const section = dashboard.section<MediaItem>(`provider-${providerId}`);
  const items = useMemo(() => section.items?.map((item) => ({ ...item, mediaType: "tv" as const, category: "series" as const })) ?? null, [section.items]);
  return { ...section, items };
};
