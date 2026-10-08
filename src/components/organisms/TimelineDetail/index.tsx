import Modal from "@/components/atoms/Modal";
import MediaGrid from "@/components/atoms/MediaGrid";
import MediaCard from "@/components/molecules/MediaCard";
import { useMediaCards } from "@/contexts/MediaCards";
import { cardKey, useOpenCard } from "@/actions/helpers/opencard";
import { timelineItems, timelineWatchedSummary } from "@/actions/helpers/timelinedetail";
import type { Timeline } from "@/actions/helpers/timelines";
import "./style.scss";

interface TimelineDetailProps {
  timeline: Timeline;
  onClose: () => void;
}

// Modal com os títulos de uma timeline (filmes e séries misturados) e o progresso de visto.
const TimelineDetail = ({ timeline, onClose }: TimelineDetailProps) => {
  const media = useMediaCards();
  const items = timelineItems(timeline);
  const open = useOpenCard(items);
  const { watched, total, pct } = timelineWatchedSummary(timeline, media.checkedMap);

  return (
    <Modal onClose={onClose} size="lg" scroll="content">
      <div className="timeline-detail__header">
        <h2 className="timeline-detail__title">{timeline.name}</h2>
        <span className="timeline-detail__progress">
          visto: {watched}/{total} ({pct}%)
        </span>
      </div>

      <MediaGrid variant="modal" scroll>
        {items.map((item, index) => {
          const id = cardKey(item, index);
          return <MediaCard isModal key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
        })}
      </MediaGrid>
    </Modal>
  );
};

export default TimelineDetail;
