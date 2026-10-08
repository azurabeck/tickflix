import { useTranslation } from "react-i18next";
import MediaGrid from "@/components/atoms/MediaGrid";
import Modal from "@/components/atoms/Modal";
import StatusMessage from "@/components/atoms/StatusMessage";
import MediaCard from "@/components/molecules/MediaCard";
import { cardKey, useOpenCard } from "@/actions/helpers/opencard";
import type { MediaItem } from "@/types/media";

interface PosterGridModalProps {
  title: string;
  items: MediaItem[] | null;
  error?: string | null;
  emptyMessage?: string;
  onOpenItem?: (item: MediaItem) => void;
  onClose: () => void;
}

// Modal "ver todos": grade rolável com todos os cards (painel fixo, só a grade rola).
const PosterGridModal = ({ title, items, error, emptyMessage, onOpenItem, onClose }: PosterGridModalProps) => {
  const { t } = useTranslation();
  const open = useOpenCard(items ?? []);

  return (
    <Modal onClose={onClose} size="xl" scroll="content" title={title}>
      {items === null && !error && <StatusMessage variant="loading">{t("dashboard.loading")}</StatusMessage>}
      {error && <StatusMessage variant="error">{error}</StatusMessage>}
      {items !== null && items.length === 0 && emptyMessage && <StatusMessage variant="empty">{emptyMessage}</StatusMessage>}

      <MediaGrid variant="modal" scroll>
        {(items ?? []).map((item, index) => {
          const id = cardKey(item, index);
          return <MediaCard isModal key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} onOpen={onOpenItem} />;
        })}
      </MediaGrid>
    </Modal>
  );
};

export default PosterGridModal;
