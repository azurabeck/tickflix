// src/pages/private/home/dashboard/PosterSections.tsx
// Os três blocos de fileira do redesenho (Figma da Rebecca): "Últimos
// vistos", "Em cartaz" (clicar no card aberto leva direto ao ingresso.com)
// e "Principais lançamentos" (chips de mês). Cada fileira tem UM card
// aberto por vez (useOpenCard). Os ranks e a sugestão da IA ficam em
// RankSection.tsx.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { buildIngressoMovieUrl } from "@/service/IngressoSettings";
import { ConnectedMediaCard, cardKey, useOpenCard } from "@/components/mediaCard";
import HomeSection from "./HomeSection";
import { RailControls, ScrollRail, useScrollRail } from "./ScrollRail";
import type { DashboardMovie, MajorReleaseMovie } from "./functions";
import type { MovieRowItem } from "./types";

// Um card do app inteiro (@/components/mediaCard) dentro de uma fileira com
// "um aberto por vez". `available` já vem resolvido do backend em cada
// lançamento — vira o ícone de streaming sem passar pelo mapa global.
const renderCard = (
  open: ReturnType<typeof useOpenCard>,
  item: MovieRowItem,
  index: number,
  options: { onOpen?: (item: MovieRowItem) => void; available?: boolean } = {}
) => {
  const id = cardKey(item, index);
  return <ConnectedMediaCard key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} onOpen={options.onOpen} available={options.available} />;
};

// --- Últimos vistos ----------------------------------------------------------

interface RecentlyWatchedSectionProps {
  movies: DashboardMovie[];
  onSeeAll: () => void;
}

export const RecentlyWatchedSection = ({ movies, onSeeAll }: RecentlyWatchedSectionProps) => {
  const { t } = useTranslation();
  const open = useOpenCard(movies);
  const rail = useScrollRail([movies, open.openKey]);
  if (movies.length === 0) return null;

  return (
    <HomeSection title={t("dashboard.rows.recentlyWatched")} actions={<RailControls rail={rail} onSeeAll={onSeeAll} />}>
      <ScrollRail rail={rail}>{movies.map((movie, index) => renderCard(open, movie, index))}</ScrollRail>
    </HomeSection>
  );
};

// --- Em cartaz ---------------------------------------------------------------

interface NowPlayingSectionProps {
  title: string;
  items: MovieRowItem[] | null;
  error: string | null;
  onSeeAll: () => void;
}

// "Em cartaz" é justamente onde faz sentido ir direto comprar ingresso —
// pedido explícito da Rebecca: "quando a gente clicar abre as sessões do
// filme lá na ingresso.com". `item.href` já vem certo (slug real do
// ingresso.com); o fallback só entra se faltar (não devia acontecer).
export const openOnIngresso = (item: MovieRowItem) =>
  window.open(item.href ?? buildIngressoMovieUrl(item.title), "_blank", "noopener,noreferrer");

export const NowPlayingSection = ({ title, items, error, onSeeAll }: NowPlayingSectionProps) => {
  const open = useOpenCard(items ?? []);
  const rail = useScrollRail([items, open.openKey]);

  return (
    <HomeSection title={title} actions={<RailControls rail={rail} onSeeAll={onSeeAll} />} loading={items === null && !error} error={error}>
      <ScrollRail rail={rail}>{(items ?? []).map((item, index) => renderCard(open, item, index, { onOpen: openOnIngresso }))}</ScrollRail>
    </HomeSection>
  );
};

// --- Principais lançamentos --------------------------------------------------

interface ReleasesSectionProps {
  movies: MajorReleaseMovie[] | null;
  error: string | null;
  onSeeAll: () => void;
}

const MONTH_CHIPS = 5;
const ROW_LIMIT = 20;

const monthLabel = (t: TFunction, yyyymm: string): string => {
  const [year, month] = yyyymm.split("-").map(Number);
  const names = t("dashboard.majorReleasesModal.months", { returnObjects: true }) as string[];
  return t("dashboard.majorReleasesModal.monthYearFormat", { month: names[month - 1], year });
};

export const ReleasesSection = ({ movies, error, onSeeAll }: ReleasesSectionProps) => {
  const { t } = useTranslation();

  // Os últimos MONTH_CHIPS meses que realmente têm lançamento, mais
  // recente primeiro (a lista já vem filtrada pra "até hoje", ver
  // fetchRecentMajorReleases) — o resto dos 12 meses fica no "ver até 12
  // meses" (MajorReleasesModal, agrupado por mês).
  const months = useMemo(() => {
    const unique = new Set((movies ?? []).map((m) => m.releaseDate.slice(0, 7)));
    return [...unique].sort((a, b) => b.localeCompare(a)).slice(0, MONTH_CHIPS);
  }, [movies]);

  const [chosenMonth, setChosenMonth] = useState<string | null>(null);
  const activeMonth = chosenMonth && months.includes(chosenMonth) ? chosenMonth : months[0] ?? null;

  const visible = useMemo(
    () => (movies ?? []).filter((m) => m.releaseDate.slice(0, 7) === activeMonth).slice(0, ROW_LIMIT),
    [movies, activeMonth]
  );

  const open = useOpenCard(visible);
  const rail = useScrollRail([visible, open.openKey]);

  const toolbar =
    months.length > 0 ? (
      <div className="home-section__chips" role="group">
        {months.map((month) => (
          <button
            key={month}
            type="button"
            className={month === activeMonth ? "home-section__chip home-section__chip--active" : "home-section__chip"}
            onClick={() => setChosenMonth(month)}
          >
            {monthLabel(t, month)}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <HomeSection
      title={t("dashboard.rows.majorReleases")}
      actions={<RailControls rail={rail} onSeeAll={onSeeAll} seeAllLabel={t("dashboard.seeUntil12Months")} />}
      loading={movies === null && !error}
      error={error}
      toolbar={toolbar}
    >
      <ScrollRail rail={rail}>{visible.map((movie, index) => renderCard(open, movie, index, { available: movie.available }))}</ScrollRail>
    </HomeSection>
  );
};
