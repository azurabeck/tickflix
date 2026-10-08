import EpisodicCatalog from "@/components/organisms/EpisodicCatalog";
import { SERIES_PAGE, useSeriesDashboard } from "@/actions/series/dashboard";
import { useSeriesHero } from "@/actions/series/hero";
import { useMyTvShows } from "@/actions/series/mytvshows";
import { useSeriesMostWatchedRank } from "@/actions/series/mostwatchedrank";
import { useSeriesMyNotesRank } from "@/actions/series/mynotesrank";
import { useSeriesBestRatedOn } from "@/actions/series/bestratedon";

// Página Series: cada section pede o que precisa; o dashboard confere cache, atualização e o pedido ao backend.
const SeriesPage = () => {
  const dashboard = useSeriesDashboard();
  const hero = useSeriesHero(dashboard);
  const mine = useMyTvShows();
  const mostWatched = useSeriesMostWatchedRank(dashboard);
  const myNotes = useSeriesMyNotesRank(dashboard);

  return <EpisodicCatalog page={SERIES_PAGE} dashboard={dashboard} hero={hero} mine={mine} mostWatched={mostWatched} myNotes={myNotes} useBestRatedOn={useSeriesBestRatedOn} />;
};

export default SeriesPage;
