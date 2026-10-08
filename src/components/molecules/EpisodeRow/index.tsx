import { Check } from "lucide-react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useEpisodeOverview } from "@/actions/helpers/seriesdetail";
import type { EpisodeAiringInfo, FollowedEpisode } from "@/actions/helpers/followed";
import "./style.scss";

interface EpisodeRowProps {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  episode: FollowedEpisode;
  airing: EpisodeAiringInfo;
  disabled: boolean;
  onToggle: () => void;
}

// Linha de episódio: marcar como visto (se já foi ao ar) + botão (i) com a descrição.
const EpisodeRow = ({ seriesId, seasonNumber, episodeNumber, episode, airing, disabled, onToggle }: EpisodeRowProps) => {
  const { t } = useTranslation();
  const info = useEpisodeOverview(seriesId, seasonNumber, episodeNumber);
  const infoLabel = t("seriesPage.episodeInfo.button", { name: episode.name });

  const infoText =
    info.state.status === "ready" ? info.state.text || t("seriesPage.episodeInfo.empty") : info.state.status === "error" ? t("seriesPage.episodeInfo.error") : t("seriesPage.episodeInfo.loading");

  const content = (
    <>
      <span className="episode-row__check">{airing.aired && episode.watched && <Check size={14} />}</span>
      <span className="episode-row__number">{episodeNumber}.</span>
      <span className="episode-row__name">{episode.name}</span>
      {!airing.aired && <span className="episode-row__airing">{airing.label}</span>}
    </>
  );

  return (
    <div className="episode-row">
      <div className="episode-row__row">
        {airing.aired ? (
          <button type="button" className={episode.watched ? "episode-row__main episode-row__main--watched" : "episode-row__main"} onClick={onToggle} disabled={disabled}>
            {content}
          </button>
        ) : (
          <div className="episode-row__main episode-row__main--unaired">{content}</div>
        )}
        <button
          type="button"
          className={info.open ? "episode-row__info-button episode-row__info-button--open" : "episode-row__info-button"}
          onClick={info.toggle}
          title={infoLabel}
          aria-label={infoLabel}
          aria-expanded={info.open}
        >
          <InformationCircleIcon />
        </button>
      </div>
      {info.open && <p className="episode-row__info">{infoText}</p>}
    </div>
  );
};

export default EpisodeRow;
