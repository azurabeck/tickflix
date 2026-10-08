import type { ReactNode } from "react";
import HomeSection from "@/components/atoms/HomeSection";
import MediaCard from "@/components/molecules/MediaCard";
import RailControls from "@/components/atoms/RailControls";
import ScrollRail from "@/components/atoms/ScrollRail";
import StatusMessage from "@/components/atoms/StatusMessage";
import { cardKey, useOpenCard } from "@/actions/helpers/opencard";
import { useScrollRail } from "@/actions/helpers/scrollrail";
import type { MediaItem } from "@/types/media";

interface MediaRailSectionProps<T extends MediaItem> {
  title: ReactNode;
  items: T[] | null;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  hideWhenEmpty?: boolean;
  toolbar?: ReactNode;
  onSeeAll?: () => void;
  seeAllLabel?: string;
  onOpenItem?: (item: MediaItem) => void;
}

// Seção com uma fileira de cards (um aberto por vez), setas e, opcionalmente, "ver todos".
const MediaRailSection = <T extends MediaItem>({ title, items, loading, error, emptyMessage, hideWhenEmpty, toolbar, onSeeAll, seeAllLabel, onOpenItem }: MediaRailSectionProps<T>) => {
  const open = useOpenCard(items ?? []);
  const rail = useScrollRail([items, open.openKey]);

  if (hideWhenEmpty && items && items.length === 0) return null;

  return (
    <HomeSection
      title={title}
      actions={<RailControls rail={rail} onSeeAll={onSeeAll} seeAllLabel={seeAllLabel} />}
      loading={loading}
      error={error}
      toolbar={toolbar}
    >
      {items && items.length === 0 && emptyMessage ? (
        <StatusMessage variant="empty">{emptyMessage}</StatusMessage>
      ) : (
        <ScrollRail rail={rail}>
          {(items ?? []).map((item, index) => {
            const id = cardKey(item, index);
            return <MediaCard key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} onOpen={onOpenItem} />;
          })}
        </ScrollRail>
      )}
    </HomeSection>
  );
};

export default MediaRailSection;
