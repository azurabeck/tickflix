// src/pages/private/series/SeriesRailSection.tsx
// Seção de fileira das páginas Séries e Animes no MESMO padrão da Home
// (Figma da Rebecca): painel #EFEFEF com título + `◀ ▶` no topo, fileira de
// cards onde só UM está aberto por vez. O card é o CARD GLOBAL
// (@/components/mediaCard), tipo `serie`: barra de episódios vistos (10 /
// 300) quando a série é seguida, check = "estou assistindo" (segue → vira
// "Minhas séries"/"Meus animes") e nota a qualquer momento. Serve pra
// "Minhas séries"/"Meus animes" e pras fileiras "Melhor avaliadas na
// {streaming}".
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { followedSeriesProgress, type FollowedCategory } from "@/service/FollowingSettings";
import { ConnectedMediaCard, cardKey, useMediaCards, useOpenCard, type MediaItem } from "@/components/mediaCard";
import HomeSection from "@/pages/private/home/dashboard/HomeSection";
import { RailControls, ScrollRail, useScrollRail } from "@/pages/private/home/dashboard/ScrollRail";
import "@/pages/private/home/dashboard/home.scss";

// Item de descoberta (TMDb) / série seguida → item do card global (tipo
// `serie`). `category` diz em qual lista o check segue o título: página
// Séries = "series", página Animes = "animes".
export const toSeriesCardItem = (
  item: { id: number; title: string; posterPath: string | null; backdropPath?: string | null },
  category: FollowedCategory
): MediaItem => ({
  id: item.id,
  mediaType: "tv",
  title: item.title,
  posterPath: item.posterPath,
  backdropPath: item.backdropPath ?? null,
  category,
});

// Filtros de "Minhas séries"/"Meus animes" pelo progresso de episódios.
type ProgressFilter = "completed" | "inProgress" | "notStarted";
const PROGRESS_FILTERS: ProgressFilter[] = ["completed", "inProgress", "notStarted"];

interface SeriesRailSectionProps {
  title: ReactNode;
  items: MediaItem[] | null;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  // Só "Minhas séries"/"Meus animes": 3 botões de filtro por progresso —
  // Concluídos (barra 100%), Em progresso (já viu ao menos 1 episódio, mas não
  // todos) e Não iniciado (nenhum episódio visto). Dá pra ligar VÁRIOS ao mesmo
  // tempo (mostra os títulos que se encaixam em qualquer um); começa só com
  // "Em progresso" e, sem nenhum ligado, mostra tudo.
  progressFilters?: boolean;
}

const SeriesRailSection = ({ title, items: allItems, loading, error, emptyMessage, progressFilters }: SeriesRailSectionProps) => {
  const { t } = useTranslation();
  const media = useMediaCards();
  const [filters, setFilters] = useState<Set<ProgressFilter>>(() => new Set<ProgressFilter>(["inProgress"]));

  const matches = (item: MediaItem, wanted: ProgressFilter): boolean => {
    const followed = item.id !== undefined ? media.followed.get(item.id) : undefined;
    if (!followed) return false;
    const { watched, total } = followedSeriesProgress(followed);
    if (wanted === "completed") return total > 0 && watched === total;
    if (wanted === "notStarted") return watched === 0;
    return watched > 0 && watched < total;
  };

  const filtering = Boolean(progressFilters) && filters.size > 0;
  const items = allItems && filtering ? allItems.filter((item) => [...filters].some((wanted) => matches(item, wanted))) : allItems;

  const open = useOpenCard(items ?? []);
  const rail = useScrollRail([items, open.openKey]);

  const toolbar =
    progressFilters && allItems && allItems.length > 0 ? (
      <div className="home-section__chips" role="group">
        {PROGRESS_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className={filters.has(option) ? "home-section__chip home-section__chip--active" : "home-section__chip"}
            aria-pressed={filters.has(option)}
            onClick={() =>
              setFilters((current) => {
                const next = new Set(current);
                if (next.has(option)) next.delete(option);
                else next.add(option);
                return next;
              })
            }
          >
            {t(`followFilter.${option}`)}
          </button>
        ))}
      </div>
    ) : null;

  const emptyText = filtering && allItems && allItems.length > 0 && items?.length === 0 ? t("followFilter.empty") : emptyMessage;

  return (
    <HomeSection title={title} actions={<RailControls rail={rail} />} loading={loading} error={error} toolbar={toolbar}>
      {items && items.length === 0 && emptyText ? (
        <p className="dashboard__empty">{emptyText}</p>
      ) : (
        <ScrollRail rail={rail}>
          {(items ?? []).map((item, index) => {
            const id = cardKey(item, index);
            return <ConnectedMediaCard key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
          })}
        </ScrollRail>
      )}
    </HomeSection>
  );
};

export default SeriesRailSection;
