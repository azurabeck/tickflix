import EpisodicCatalog from "@/components/organisms/EpisodicCatalog";
import { ANIMES_PAGE, useAnimesDashboard } from "@/actions/animes/dashboard";
import { useAnimesHero } from "@/actions/animes/hero";
import { useMyAnimes } from "@/actions/animes/myanimes";
import { useAnimesMostWatchedRank } from "@/actions/animes/mostwatchedrank";
import { useAnimesMyNotesRank } from "@/actions/animes/mynotesrank";
import { useAnimesBestRatedOn } from "@/actions/animes/bestratedon";

// Página Animes: cada section pede o que precisa; o dashboard confere cache, atualização e o pedido ao backend.
const AnimePage = () => {
  const dashboard = useAnimesDashboard();
  const hero = useAnimesHero(dashboard);
  const mine = useMyAnimes();
  const mostWatched = useAnimesMostWatchedRank(dashboard);
  const myNotes = useAnimesMyNotesRank();

  return <EpisodicCatalog page={ANIMES_PAGE} dashboard={dashboard} hero={hero} mine={mine} mostWatched={mostWatched} myNotes={myNotes} useBestRatedOn={useAnimesBestRatedOn} />;
};

export default AnimePage;
