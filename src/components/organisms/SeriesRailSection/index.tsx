import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import FilterChips from "@/components/atoms/FilterChips";
import MediaRailSection from "@/components/organisms/MediaRailSection";
import { useMediaCards } from "@/contexts/MediaCards";
import { PROGRESS_FILTERS, progressGroup, type ProgressFilter } from "@/actions/helpers/progress";
import type { MediaItem } from "@/types/media";

interface SeriesRailSectionProps {
  title: ReactNode;
  items: MediaItem[] | null;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  progressFilters?: boolean;
}

// Fileira de séries/animes. Com progressFilters (Minhas séries/Meus animes) ganha os filtros
// Concluídos / Em Progresso / Em breve / Não iniciado (vários ao mesmo tempo; começa em Em Progresso).
const SeriesRailSection = ({ title, items: allItems, loading, error, emptyMessage, progressFilters }: SeriesRailSectionProps) => {
  const { t } = useTranslation();
  const media = useMediaCards();
  const [filters, setFilters] = useState<ProgressFilter[]>(["inProgress"]);

  const filtering = Boolean(progressFilters) && filters.length > 0;
  const matches = (item: MediaItem): boolean => {
    const followed = item.id !== undefined ? media.followed.get(item.id) : undefined;
    return followed ? filters.includes(progressGroup(followed)) : false;
  };
  const items = allItems && filtering ? allItems.filter(matches) : allItems;
  const emptyText = filtering && allItems && allItems.length > 0 && items?.length === 0 ? t("followFilter.empty") : emptyMessage;

  const toggleFilter = (value: ProgressFilter) => setFilters((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]));

  return (
    <MediaRailSection
      title={title}
      items={items}
      loading={loading}
      error={error}
      emptyMessage={emptyText}
      toolbar={
        progressFilters && allItems && allItems.length > 0 ? (
          <FilterChips options={PROGRESS_FILTERS.map((option) => ({ value: option, label: t(`followFilter.${option}`) }))} active={filters} onToggle={toggleFilter} />
        ) : null
      }
    />
  );
};

export default SeriesRailSection;
