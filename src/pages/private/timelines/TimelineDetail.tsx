// src/pages/private/timelines/TimelineDetail.tsx
// Dialog que abre ao clicar num card de timeline — grade dos títulos dela
// com o CARD GLOBAL de filme/série/anime (@/components/mediaCard): filme é
// o card `movie`, série/anime o card `serie` (uma timeline pode misturar).
// É um MODAL de verdade (overlay por cima da página, mesmo padrão de
// @/components/movieDetail) — nunca substitui a tela.
//
// O estado dos cards (assistido/seguindo, nota, disponibilidade, trailer,
// detalhe) é GLOBAL (MediaCardsProvider, montado em PrivateLayout) — esse
// componente só pede a disponibilidade dos títulos da timeline e desenha a
// grade, não recebe mais Map/handlers de quem abre. Importa o próprio CSS
// (não confia em quem renderiza já ter importado styles.scss) já que abre
// a partir de várias páginas.
import { useEffect } from "react";
import { X } from "lucide-react";
import { timelineMovieKey, type Timeline } from "@/service/TimelineSettings";
import { ConnectedMediaCard, cardKey, useMediaCards, useOpenCard, type MediaItem } from "@/components/mediaCard";
import "./styles.scss";

interface TimelineDetailProps {
  timeline: Timeline;
  onClose: () => void;
}

const TimelineDetail = ({ timeline, onClose }: TimelineDetailProps) => {
  const media = useMediaCards();

  const items: MediaItem[] = timeline.movies.map((movie) => ({
    id: movie.id,
    mediaType: movie.mediaType,
    title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
    posterPath: movie.posterPath,
  }));
  const open = useOpenCard(items);

  useEffect(() => {
    media.loadAvailability(timeline.movies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.id]);

  const watchedCount = timeline.movies.filter((movie) => media.checkedMap.has(timelineMovieKey(movie))).length;
  const pct = timeline.movies.length === 0 ? 0 : Math.round((watchedCount / timeline.movies.length) * 100);

  return (
    <div className="timelines-page__detail-overlay" onClick={onClose}>
      <div className="timelines-page__detail-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="timelines-page__detail-close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <div className="timelines-page__detail-header">
          <h2 className="timelines-page__detail-title">{timeline.name}</h2>
          <span className="timelines-page__detail-progress">
            visto: {watchedCount}/{timeline.movies.length} ({pct}%)
          </span>
        </div>

        <div className="media-grid media-grid--modal media-grid--scroll">
          {items.map((item, index) => {
            const id = cardKey(item, index);
            return <ConnectedMediaCard isModal key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineDetail;
