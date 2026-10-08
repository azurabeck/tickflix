import { Check, ChevronDown, ChevronRight } from "lucide-react";
import EpisodeRow from "@/components/molecules/EpisodeRow";
import { seasonAiredProgress, seasonProgress, sortedNumberKeys } from "@/actions/helpers/seriesdetail";
import { episodeAiringInfo, type FollowedSeason } from "@/actions/helpers/followed";
import { progressPercent } from "@/actions/helpers/timelines";
import "./style.scss";

interface SeasonItemProps {
  seriesId: number;
  seriesStatus: string;
  seasonNumber: number;
  season: FollowedSeason;
  uid: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleWholeSeason: () => void;
  onToggleEpisode: (episode: number) => void;
}

// Temporada do acordeão: cabeçalho com progresso e "marcar temporada inteira"; aberta, lista os episódios.
const SeasonItem = ({ seriesId, seriesStatus, seasonNumber, season, uid, expanded, onToggleExpanded, onToggleWholeSeason, onToggleEpisode }: SeasonItemProps) => {
  const { watched, total } = seasonProgress(season);
  const seasonPct = progressPercent(watched, total);
  const episodeNumbers = sortedNumberKeys(season.episodes);
  const allAired = episodeNumbers.every((ep) => episodeAiringInfo(season.episodes[String(ep)], seriesStatus).aired);
  const airedProgress = seasonAiredProgress(season, seriesStatus);
  const fullyMarked = airedProgress.total > 0 && airedProgress.watched === airedProgress.total;
  const markAllLabel = fullyMarked ? "Desmarcar temporada inteira" : "Marcar temporada inteira como vista";

  return (
    <div className="season-item">
      <div className="season-item__header">
        <button type="button" className="season-item__toggle" onClick={onToggleExpanded} aria-expanded={expanded}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="season-item__name">{season.name || `Temporada ${seasonNumber}`}</span>
        </button>

        <span className="season-item__count">
          {watched}/{total}
        </span>

        <button
          type="button"
          className={fullyMarked ? "season-item__mark-all season-item__mark-all--active" : "season-item__mark-all"}
          onClick={onToggleWholeSeason}
          disabled={!uid || airedProgress.total === 0}
          title={markAllLabel}
          aria-label={markAllLabel}
        >
          <Check size={14} />
        </button>
      </div>

      <div className="season-item__progress-bar">
        <div className="season-item__progress-fill" style={{ width: `${seasonPct}%` }} />
      </div>

      {expanded && (
        <div className="season-item__episodes">
          {episodeNumbers.map((ep) => (
            <EpisodeRow
              key={ep}
              seriesId={seriesId}
              seasonNumber={seasonNumber}
              episodeNumber={ep}
              episode={season.episodes[String(ep)]}
              airing={episodeAiringInfo(season.episodes[String(ep)], seriesStatus)}
              disabled={!uid}
              onToggle={() => onToggleEpisode(ep)}
            />
          ))}
          {!allAired && <p className="season-item__hint">Episódios sem marcação ainda não foram ao ar.</p>}
        </div>
      )}
    </div>
  );
};

export default SeasonItem;
