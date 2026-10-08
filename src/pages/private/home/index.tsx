import { useState } from "react";
import { useTranslation } from "react-i18next";
import HomeGroup from "@/components/atoms/HomeGroup";
import CreateTimelinePanel from "@/components/organisms/CreateTimelinePanel";
import FollowedTimelinesRow from "@/components/organisms/FollowedTimelinesRow";
import HeroCarousel from "@/components/organisms/HeroCarousel";
import MajorReleasesModal from "@/components/organisms/MajorReleasesModal";
import MediaRailSection from "@/components/organisms/MediaRailSection";
import PosterGridModal from "@/components/organisms/PosterGridModal";
import RankSection from "@/components/organisms/RankSection";
import RecentlyWatchedModal from "@/components/organisms/RecentlyWatchedModal";
import MajorReleasesSection from "@/components/organisms/MajorReleasesSection";
import TimelineDetail from "@/components/organisms/TimelineDetail";
import { useMediaCards } from "@/contexts/MediaCards";
import { useMoviesDashboard } from "@/actions/movies/dashboard";
import { usePopularityRank } from "@/actions/movies/popularityrank";
import { useHero } from "@/actions/movies/hero";
import { useMajorReleases } from "@/actions/movies/majorreleases";
import { openOnIngresso, useNowPlaying } from "@/actions/movies/nowplaying";
import { RAIL_LIMIT, useRecentlyWatched } from "@/actions/movies/recentlywatched";
import { auth } from "@/service/FirebaseSettings";
import type { Timeline } from "@/actions/helpers/timelines";
import "./style.scss";

// Página inicial (Filmes): cada section pede o que precisa; o dashboard confere cache, atualização e cidade.
const Home = () => {
  const { t } = useTranslation();
  const uid = auth.currentUser?.uid ?? null;

  const media = useMediaCards();
  const dashboard = useMoviesDashboard();
  const hero = useHero(dashboard);
  const nowPlaying = useNowPlaying(dashboard);
  const boxOffice = usePopularityRank(dashboard);
  const releases = useMajorReleases(dashboard);
  const recent = useRecentlyWatched(RAIL_LIMIT);

  const [recentModalOpen, setRecentModalOpen] = useState(false);
  const [nowPlayingModalOpen, setNowPlayingModalOpen] = useState(false);
  const [releasesModalOpen, setReleasesModalOpen] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);

  return (
    <div className="home-page">
      <HeroCarousel items={hero.items ?? []} loading={hero.loading} />

      <CreateTimelinePanel uid={uid} />

      <FollowedTimelinesRow timelines={dashboard.firebase.followedTimelines.items} watchedMap={media.checkedMap} onSelect={setSelectedTimeline} />

      <HomeGroup>
        <MediaRailSection title={t("dashboard.rows.recentlyWatched")} items={recent.items} loading={recent.loading} hideWhenEmpty onSeeAll={() => setRecentModalOpen(true)} />

        <RankSection
          popularityTitle={
            <>
              {t("dashboard.rank.popularityLabel")} <strong>{new Date().getFullYear()}</strong>
            </>
          }
          popularity={boxOffice.items}
          popularityLoading={boxOffice.loading}
          popularityError={boxOffice.error}
          recentKeys={recent.keys}
        />

        <MediaRailSection
          title={nowPlaying.title}
          items={nowPlaying.items}
          loading={nowPlaying.loading}
          error={nowPlaying.error}
          onSeeAll={() => setNowPlayingModalOpen(true)}
          onOpenItem={openOnIngresso}
        />

        <MajorReleasesSection movies={releases.items} loading={releases.loading} error={releases.error} onSeeAll={() => setReleasesModalOpen(true)} />
      </HomeGroup>

      {recentModalOpen && <RecentlyWatchedModal onClose={() => setRecentModalOpen(false)} />}

      {nowPlayingModalOpen && (
        <PosterGridModal title={nowPlaying.title} items={nowPlaying.items} error={nowPlaying.error} onOpenItem={openOnIngresso} onClose={() => setNowPlayingModalOpen(false)} />
      )}

      {releasesModalOpen && <MajorReleasesModal movies={releases.items} error={releases.error} onClose={() => setReleasesModalOpen(false)} />}

      {selectedTimeline && <TimelineDetail timeline={selectedTimeline} onClose={() => setSelectedTimeline(null)} />}
    </div>
  );
};

export default Home;
