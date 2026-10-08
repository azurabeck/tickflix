import { useState } from "react";
import DetailPanel from "@/components/atoms/DetailPanel";
import MovieDetailCast from "@/components/molecules/MovieDetailCast";
import MovieDetailHeader from "@/components/molecules/MovieDetailHeader";
import MovieDetailProviders from "@/components/molecules/MovieDetailProviders";
import SeasonItem from "@/components/molecules/SeasonItem";
import { useMovieDetail } from "@/actions/helpers/moviedetail";
import { airedEpisodesOf, firstUnfinishedSeason, sortedNumberKeys } from "@/actions/helpers/seriesdetail";
import { followedSeriesProgress, type FollowedSeries } from "@/actions/helpers/followed";
import { progressPercent } from "@/actions/helpers/timelines";
import "./style.scss";

interface SeriesDetailProps {
  series: FollowedSeries;
  uid: string | null;
  onClose: () => void;
  onToggleEpisode: (series: FollowedSeries, season: number, episode: number) => void;
  onToggleSeason: (series: FollowedSeries, season: number, episodes: number[], watched: boolean) => void;
}

// Detalhe de uma série/anime seguido: capa + episódios por temporada + elenco + onde assistir.
const SeriesDetail = ({ series, uid, onClose, onToggleEpisode, onToggleSeason }: SeriesDetailProps) => {
  const { detail, error, providers, providersLoading } = useMovieDetail(series.id, "tv");
  const seasonNumbers = sortedNumberKeys(series.seasons);
  const firstOpen = firstUnfinishedSeason(series);
  const [expanded, setExpanded] = useState<Set<number>>(new Set(firstOpen !== undefined ? [firstOpen] : []));

  const toggleExpanded = (seasonNumber: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) next.delete(seasonNumber);
      else next.add(seasonNumber);
      return next;
    });

  const toggleWholeSeason = (seasonNumber: number) => {
    const { numbers, allWatched } = airedEpisodesOf(series.seasons[String(seasonNumber)], series.status);
    if (numbers.length === 0) return;
    onToggleSeason(series, seasonNumber, numbers, !allWatched);
  };

  const { watched, total } = followedSeriesProgress(series);
  const pct = progressPercent(watched, total);

  return (
    <DetailPanel onClose={onClose} loading={!detail && !error} error={error}>
      {detail && (
        <>
          <MovieDetailHeader detail={detail} />

          <div className="series-detail__section">
            <div className="series-detail__header">
              <h3 className="series-detail__title">Episódios</h3>
              <span className="series-detail__progress-text">
                visto: {watched}/{total} ({pct}%)
              </span>
            </div>
            <div className="series-detail__progress-bar">
              <div className="series-detail__progress-fill" style={{ width: `${pct}%` }} />
            </div>

            <div className="series-detail__seasons">
              {seasonNumbers.map((seasonNumber) => (
                <SeasonItem
                  key={seasonNumber}
                  seriesId={series.id}
                  seriesStatus={series.status}
                  seasonNumber={seasonNumber}
                  season={series.seasons[String(seasonNumber)]}
                  uid={uid}
                  expanded={expanded.has(seasonNumber)}
                  onToggleExpanded={() => toggleExpanded(seasonNumber)}
                  onToggleWholeSeason={() => toggleWholeSeason(seasonNumber)}
                  onToggleEpisode={(episode) => onToggleEpisode(series, seasonNumber, episode)}
                />
              ))}
            </div>
          </div>

          <MovieDetailCast cast={detail.cast} />
          <MovieDetailProviders providersLoading={providersLoading} providers={providers} />
        </>
      )}
    </DetailPanel>
  );
};

export default SeriesDetail;
