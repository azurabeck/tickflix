import type { SeriesDashboard } from "@/actions/series/dashboard";
import type { HeroTrailer } from "@/types/media";

// Section Hero (trailers do topo): pega a fatia "hero" do dashboard (com o loading dela). Os trailers vêm das "Mais vistas do ano".
// usado em: página Séries
export const useSeriesHero = (dashboard: SeriesDashboard) => dashboard.section<HeroTrailer>("hero");
