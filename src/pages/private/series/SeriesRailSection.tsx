// src/pages/private/series/SeriesRailSection.tsx
// Seção de fileira das páginas Séries e Animes no MESMO padrão da Home
// (Figma da Rebecca): painel #EFEFEF com título + `◀ ▶` no topo, fileira de
// cards onde só UM está aberto por vez. O card é o CARD GLOBAL
// (@/components/mediaCard), tipo `serie`: barra de episódios vistos (10 /
// 300) quando a série é seguida, check = "estou assistindo" (segue → vira
// "Minhas séries"/"Meus animes") e nota a qualquer momento. Serve pra
// "Minhas séries"/"Meus animes" e pras fileiras "Melhor avaliadas na
// {streaming}".
import type { ReactNode } from "react";
import type { FollowedCategory } from "@/service/FollowingSettings";
import { ConnectedMediaCard, cardKey, useOpenCard, type MediaItem } from "@/components/mediaCard";
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

interface SeriesRailSectionProps {
  title: ReactNode;
  items: MediaItem[] | null;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

const SeriesRailSection = ({ title, items, loading, error, emptyMessage }: SeriesRailSectionProps) => {
  const open = useOpenCard(items ?? []);
  const rail = useScrollRail([items, open.openKey]);

  return (
    <HomeSection title={title} actions={<RailControls rail={rail} />} loading={loading} error={error}>
      {items && items.length === 0 && emptyMessage ? (
        <p className="dashboard__empty">{emptyMessage}</p>
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
