import { usePageDashboard } from "@/actions/helpers/section";
import { STREAMING_PROVIDERS } from "@/actions/helpers/streamings";

// O que é próprio da página Series (chaves de tradução dos títulos e categoria dos cards).
// usado em: página Séries
export const SERIES_PAGE = {
  category: "series",
  timelineType: "series",
  labels: {
    mine: "seriesPage.mySeries",
    empty: "seriesPage.emptyMine",
    mostWatched: "seriesPage.mostWatched",
    bestRatedOn: "seriesPage.bestRatedOn",
    placeholder: "dashboard.createTimeline.placeholderSeries",
  },
} as const;

// Dashboard da página Series: um pedido ao backend por grupo (Hero, Mais vistas e as fileiras por streaming, cada grupo por conta própria)
// e uma leitura do Firebase. No TMDb séries e animes são ambos `tv`; aqui vêm só as séries.
// usado em: página Séries
export const useSeriesDashboard = () =>
  usePageDashboard("series", { endpoint: "series", params: { kind: "series" }, groups: [["hero"], ["top"], STREAMING_PROVIDERS.map((p) => `provider-${p.id}`)], timelineType: SERIES_PAGE.timelineType });

// usado em: Hero, Mais vistas e Melhores avaliadas da página Series
export type SeriesDashboard = ReturnType<typeof useSeriesDashboard>;
