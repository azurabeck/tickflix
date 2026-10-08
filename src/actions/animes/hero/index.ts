import type { AnimesDashboard } from "@/actions/animes/dashboard";
import type { HeroTrailer } from "@/types/media";

// Section Hero (trailers do topo): pega a fatia "hero" do dashboard (com o loading dela). Os trailers vêm das "Mais vistas do ano".
// usado em: página Animes
export const useAnimesHero = (dashboard: AnimesDashboard) => dashboard.section<HeroTrailer>("hero");
