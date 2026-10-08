import { usePageDashboard } from "@/actions/helpers/section";
import { STREAMING_PROVIDERS } from "@/actions/helpers/streamings";

// O que é próprio da página Animes (chaves de tradução dos títulos e categoria dos cards).
// usado em: página Animes
export const ANIMES_PAGE = {
  category: "animes",
  timelineType: "animes",
  labels: {
    mine: "animePage.myAnime",
    empty: "animePage.emptyMine",
    mostWatched: "animePage.mostWatched",
    bestRatedOn: "animePage.bestRatedOn",
    placeholder: "dashboard.createTimeline.placeholderAnimes",
  },
} as const;

// Dashboard da página Animes: um pedido ao backend por grupo (Hero, Mais vistas e as fileiras por streaming, cada grupo por conta própria)
// e uma leitura do Firebase. No TMDb séries e animes são ambos `tv`; aqui vêm só os animes.
// usado em: página Animes
export const useAnimesDashboard = () =>
  usePageDashboard("animes", { endpoint: "series", params: { kind: "anime" }, groups: [["hero"], ["top"], STREAMING_PROVIDERS.map((p) => `provider-${p.id}`)], timelineType: ANIMES_PAGE.timelineType, mediaKind: "tv", category: ANIMES_PAGE.category });

// usado em: Hero, Mais vistas e Melhores avaliadas da página Animes
export type AnimesDashboard = ReturnType<typeof useAnimesDashboard>;
