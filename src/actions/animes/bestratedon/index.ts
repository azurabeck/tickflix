import { useMemo } from "react";
import type { AnimesDashboard } from "@/actions/animes/dashboard";
import type { MediaItem } from "@/types/media";

// Section "Melhor avaliados no <streaming>" (uma por streaming): pega a fatia `provider-<id>` do dashboard (com o loading dela) e marca a categoria dos cards.
// usado em: página Animes
export const useAnimesBestRatedOn = (dashboard: AnimesDashboard, providerId: number) => {
  const section = dashboard.section<MediaItem>(`provider-${providerId}`);
  const items = useMemo(() => section.items?.map((item) => ({ ...item, mediaType: "tv" as const, category: "animes" as const })) ?? null, [section.items]);
  return { ...section, items };
};
