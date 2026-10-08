import { useTranslation } from "react-i18next";
import PageContainer from "@/components/atoms/PageContainer";
import { timelineProgress, progressPercent, type Timeline } from "@/actions/helpers/timelines";
import { posterUrl } from "@/service/TMDbSettings";
import "./style.scss";

interface FollowedTimelinesRowProps {
  timelines: Timeline[];
  watchedMap: Map<string, number>;
  onSelect: (timeline: Timeline) => void;
}

// Faixa "Timelines que você segue": um card por timeline com o progresso de visto.
const FollowedTimelinesRow = ({ timelines, watchedMap, onSelect }: FollowedTimelinesRowProps) => {
  const { t } = useTranslation();
  if (timelines.length === 0) return null;

  return (
    <section className="followed-timelines">
      <PageContainer>
        <div className="followed-timelines__row">
          {timelines.map((timeline) => {
            const { watched, total } = timelineProgress(timeline, watchedMap);
            const pct = progressPercent(watched, total);
            const poster = posterUrl(timeline.movies[0]?.posterPath ?? null);

            return (
              <button key={timeline.id} type="button" className="followed-timelines__card" onClick={() => onSelect(timeline)}>
                {poster && <img src={poster} alt="" className="followed-timelines__card-bg" />}
                <div className="followed-timelines__card-overlay" />
                <span className="followed-timelines__card-name">{timeline.name}</span>
                <div className="followed-timelines__card-progress">
                  <div className="followed-timelines__card-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="followed-timelines__card-count">{t("watchedProgress", { watched, total })}</span>
              </button>
            );
          })}
        </div>
      </PageContainer>
    </section>
  );
};

export default FollowedTimelinesRow;
