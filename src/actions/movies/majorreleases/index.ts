import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { PageDashboard } from "@/actions/helpers/section";
import type { MajorReleaseMovie } from "@/types/media";

// Section "Principais lançamentos": pega a fatia "releases" do dashboard (com o loading dela).
// usado em: presentation/cyclerender, página Filmes
export const useMajorReleases = (dashboard: PageDashboard) => {
  const { t } = useTranslation();
  return dashboard.section<MajorReleaseMovie>("releases", t("dashboard.errors.majorReleases"));
};

// Organização para mostrar: meses disponíveis (os chips), lançamentos de um mês e agrupamento por mês (modal "ver até 12 meses").

const MONTH_CHIPS = 5;
const ROW_LIMIT = 20;

// "Outubro de 2026" a partir de `2026-10`, no idioma do app.
// usado em: MajorReleasesSection
export const monthLabel = (t: TFunction, yyyymm: string): string => {
  const [year, month] = yyyymm.split("-").map(Number);
  const names = t("dashboard.majorReleasesModal.months", { returnObjects: true }) as string[];
  return t("dashboard.majorReleasesModal.monthYearFormat", { month: names[month - 1], year });
};

// Os últimos meses que têm lançamento, do mais recente pro mais antigo.
// usado em: presentation/cyclefilters, MajorReleasesSection
export const releaseMonths = (movies: MajorReleaseMovie[] | null): string[] => {
  const unique = new Set((movies ?? []).map((m) => m.releaseDate.slice(0, 7)));
  return [...unique].sort((a, b) => b.localeCompare(a)).slice(0, MONTH_CHIPS);
};

// Lançamentos de um mês, no limite de uma fileira.
// usado em: presentation/cyclefilters, MajorReleasesSection
export const releasesOfMonth = (movies: MajorReleaseMovie[] | null, month: string | null): MajorReleaseMovie[] =>
  (movies ?? []).filter((m) => m.releaseDate.slice(0, 7) === month).slice(0, ROW_LIMIT);

interface MonthGroup {
  key: string;
  label: string;
  movies: MajorReleaseMovie[];
}

// Agrupa por mês (mais recente primeiro) mantendo a ordem original dentro de cada mês.
// usado em: MajorReleasesModal
export const groupByMonth = (t: TFunction, movies: MajorReleaseMovie[]): MonthGroup[] => {
  const byMonth = new Map<string, MajorReleaseMovie[]>();
  for (const movie of movies) {
    const key = movie.releaseDate.slice(0, 7);
    const group = byMonth.get(key);
    if (group) group.push(movie);
    else byMonth.set(key, [movie]);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupMovies]) => ({ key, label: monthLabel(t, key), movies: groupMovies }));
};
