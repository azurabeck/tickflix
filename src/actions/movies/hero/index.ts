import type { PageDashboard } from "@/actions/helpers/section";
import type { HeroTrailer } from "@/types/media";

// Section Hero (trailers do topo): pega a fatia "hero" do dashboard (com o loading dela).
// usado em: página Filmes
export const useHero = (dashboard: PageDashboard) => dashboard.section<HeroTrailer>("hero");
