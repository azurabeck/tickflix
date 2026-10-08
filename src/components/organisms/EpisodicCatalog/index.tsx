import { useState } from "react";
import { useTranslation } from "react-i18next";
import HomeGroup from "@/components/atoms/HomeGroup";
import BestRatedOnRail from "@/components/organisms/BestRatedOnRail";
import CreateTimelinePanel from "@/components/organisms/CreateTimelinePanel";
import FollowedTimelinesRow from "@/components/organisms/FollowedTimelinesRow";
import HeroCarousel from "@/components/organisms/HeroCarousel";
import RankSection from "@/components/organisms/RankSection";
import SeriesRailSection from "@/components/organisms/SeriesRailSection";
import TimelineDetail from "@/components/organisms/TimelineDetail";
import { useMediaCards } from "@/contexts/MediaCards";
import type { MyNotes } from "@/actions/helpers/rank";
import type { PageDashboard, Section } from "@/actions/helpers/section";
import { STREAMING_PROVIDERS } from "@/actions/helpers/streamings";
import type { Timeline } from "@/actions/helpers/timelines";
import type { HeroTrailer, MediaItem, RankItem } from "@/types/media";
import "./style.scss";

interface EpisodicCatalogProps {
  page: { category: "series" | "animes"; timelineType: "series" | "animes"; labels: { mine: string; empty: string; mostWatched: string; bestRatedOn: string; placeholder: string } };
  dashboard: PageDashboard;
  hero: Section<HeroTrailer>;
  mine: { items: MediaItem[]; loading: boolean };
  mostWatched: Section<RankItem>;
  myNotes: MyNotes;
  useBestRatedOn: (dashboard: PageDashboard, providerId: number) => Section<MediaItem>;
}

// Layout das páginas Séries e Animes: minha lista, ranks + IA e uma fileira por streaming. Só monta; as sections vêm prontas de cada página.
const EpisodicCatalog = ({ page, dashboard, hero, mine, mostWatched, myNotes, useBestRatedOn }: EpisodicCatalogProps) => {
  const { t } = useTranslation();
  const media = useMediaCards();
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);

  return (
    <div className="episodic-catalog">
      <HeroCarousel items={hero.items ?? []} loading={hero.loading} />

      <CreateTimelinePanel uid={dashboard.uid} categoryLock={page.timelineType} placeholder={t(page.labels.placeholder)} />

      <FollowedTimelinesRow timelines={dashboard.firebase.followedTimelines.items} watchedMap={media.checkedMap} onSelect={setSelectedTimeline} />

      <HomeGroup>
        <SeriesRailSection title={t(page.labels.mine)} items={mine.items} loading={mine.loading} emptyMessage={t(page.labels.empty)} progressFilters />

        <RankSection
          mediaKind="tv"
          category={page.category}
          popularityTitle={
            <>
              {t(page.labels.mostWatched)} <strong>{new Date().getFullYear()}</strong>
            </>
          }
          popularity={mostWatched}
          myNotes={myNotes}
        />

        {STREAMING_PROVIDERS.map((provider) => (
          <BestRatedOnRail key={provider.id} dashboard={dashboard} provider={provider} titleKey={page.labels.bestRatedOn} useBestRatedOn={useBestRatedOn} />
        ))}
      </HomeGroup>

      {selectedTimeline && <TimelineDetail timeline={selectedTimeline} onClose={() => setSelectedTimeline(null)} />}
    </div>
  );
};

export default EpisodicCatalog;
