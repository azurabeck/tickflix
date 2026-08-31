// src/pages/private/home/dashboard/FollowedTimelinesRow.tsx
// "Timelines que você segue" — fileira de cards das timelines com a
// estrela marcada (Timeline.followed, @/pages/private/timelines).
// Extraído do JSX inline que vivia em index.tsx pra reuso — pedido
// explícito da Rebecca: a página Séries ganhou a MESMA estrutura inicial
// da Home (trailer + criar timeline + timelines seguidas), só que
// relativa a séries. Esse componente é "burro" de propósito — quem
// chama já filtra a lista (por categoria "filmes"/"series", ver
// `Timeline.types`) e passa pronta; ele só sabe renderizar.
import { timelineProgress, progressPercent, type Timeline } from "@/service/TimelineSettings";
import { posterUrl } from "@/service/TMDbSettings";

interface FollowedTimelinesRowProps {
  timelines: Timeline[];
  watchedMap: Map<string, number>;
  onSelect: (timeline: Timeline) => void;
}

const FollowedTimelinesRow = ({ timelines, watchedMap, onSelect }: FollowedTimelinesRowProps) => {
  if (timelines.length === 0) return null;

  return (
    <section className="dashboard__row-timelines">
      <div className="dashboard__inner">
        <div className="dashboard__timeline-row">
          {timelines.map((timeline) => {
            const { watched, total } = timelineProgress(timeline, watchedMap);
            const pct = progressPercent(watched, total);
            const poster = posterUrl(timeline.movies[0]?.posterPath ?? null);

            return (
              <button key={timeline.id} type="button" className="dashboard__timeline-card" onClick={() => onSelect(timeline)}>
                {poster && <img src={poster} alt="" className="dashboard__timeline-card-bg" />}
                <div className="dashboard__timeline-card-overlay" />
                <span className="dashboard__timeline-card-name">{timeline.name}</span>
                <div className="dashboard__timeline-card-progress">
                  <div className="dashboard__timeline-card-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="dashboard__timeline-card-count">
                  visto: {watched}/{total}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FollowedTimelinesRow;
