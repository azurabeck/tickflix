import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusMessage from "@/components/atoms/StatusMessage";
import TimelineCard from "@/components/molecules/TimelineCard";
import TimelineDetail from "@/components/organisms/TimelineDetail";
import { useMediaCards } from "@/contexts/MediaCards";
import { parseCategory, timelinesOfCategory, useMyTimelines } from "@/actions/timelines/mytimelines";
import { ROUTES } from "@/routes";
import type { Timeline, TimelineCategoryFilter } from "@/actions/helpers/timelines";
import "./style.scss";

const CATEGORY_CONFIG: Record<TimelineCategoryFilter, { label: string; article: string; emptyHint: React.ReactNode }> = {
  filmes: {
    label: "filmes",
    article: "os",
    emptyHint: (
      <>
        Crie uma na <Link to={ROUTES.HOME}>Filmes</Link>!
      </>
    ),
  },
  series: {
    label: "séries",
    article: "as",
    emptyHint: (
      <>
        Crie uma na <Link to={ROUTES.SERIES}>Séries</Link>!
      </>
    ),
  },
  animes: {
    label: "animes",
    article: "os",
    emptyHint: (
      <>
        Crie uma na <Link to={ROUTES.ANIMES}>Animes</Link>!
      </>
    ),
  },
  franquias: {
    label: "franquias",
    article: "as",
    emptyHint: <>Visite uma franquia pelo menu "Franquias" lá em cima — a timeline é criada automaticamente.</>,
  },
  premiacoes: {
    label: "premiações",
    article: "as",
    emptyHint: (
      <>
        Marque "já vi" num indicado do <Link to={ROUTES.OSCAR}>Oscar</Link>, Globo de Ouro ou Festival de Cannes — a
        timeline é criada automaticamente.
      </>
    ),
  },
};

const TimelinesPage = () => {
  const [searchParams] = useSearchParams();
  const category = parseCategory(searchParams.get("category"));
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);
  const { checkedMap } = useMediaCards();
  const { uid, timelines, error, deletingId, deleteError, toggleFollowed, remove } = useMyTimelines();

  const config = CATEGORY_CONFIG[category];
  const categoryTimelines = timelinesOfCategory(timelines, category);

  return (
    <div className="timelines-page">
      <div className="timelines-page__inner">
        <h1 className="timelines-page__title">Minhas timelines de {config.label}</h1>
        <p className="timelines-page__hint">
          Gerencie {config.article} {config.label} que quer ver aqui.
        </p>

        {timelines === null && (
          <StatusMessage variant="loading" spinner>
            Carregando timelines...
          </StatusMessage>
        )}
        {error && <StatusMessage variant="error">{error}</StatusMessage>}
        {deleteError && <StatusMessage variant="error">{deleteError}</StatusMessage>}

        {timelines && categoryTimelines.length === 0 && !error && (
          <p className="timelines-page__empty">
            Você ainda não tem nenhuma timeline de {config.label}. {config.emptyHint} Se quiser entender melhor como funciona, <Link to={ROUTES.ABOUT}>saiba mais aqui</Link>.
          </p>
        )}

        <div className="timelines-page__grid">
          {categoryTimelines.map((timeline) => (
            <TimelineCard
              key={timeline.id}
              timeline={timeline}
              watchedMap={checkedMap}
              disabled={!uid}
              deleting={deletingId === timeline.id}
              onOpen={() => setSelectedTimeline(timeline)}
              onToggleFollow={() => toggleFollowed(timeline)}
              onDelete={() => remove(timeline)}
            />
          ))}
        </div>
      </div>

      {selectedTimeline && <TimelineDetail timeline={selectedTimeline} onClose={() => setSelectedTimeline(null)} />}
    </div>
  );
}

export default TimelinesPage;
