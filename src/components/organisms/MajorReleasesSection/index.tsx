import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import FilterChips from "@/components/atoms/FilterChips";
import MediaRailSection from "@/components/organisms/MediaRailSection";
import { monthLabel, releaseMonths, releasesOfMonth } from "@/actions/movies/majorreleases";
import type { MajorReleaseMovie } from "@/types/media";

interface ReleasesSectionProps {
  movies: MajorReleaseMovie[] | null;
  loading?: boolean;
  error: string | null;
  onSeeAll: () => void;
}

// "Principais lançamentos": chips de mês e a fileira do mês escolhido.
const MajorReleasesSection = ({ movies, loading, error, onSeeAll }: ReleasesSectionProps) => {
  const { t } = useTranslation();
  const months = useMemo(() => releaseMonths(movies), [movies]);
  const [chosenMonth, setChosenMonth] = useState<string | null>(null);
  const activeMonth = chosenMonth && months.includes(chosenMonth) ? chosenMonth : months[0] ?? null;
  const visible = useMemo(() => releasesOfMonth(movies, activeMonth), [movies, activeMonth]);

  return (
    <MediaRailSection
      title={t("dashboard.rows.majorReleases")}
      items={movies === null ? null : visible}
      loading={loading ?? (movies === null && !error)}
      error={error}
      onSeeAll={onSeeAll}
      seeAllLabel={t("dashboard.seeUntil12Months")}
      toolbar={
        months.length > 0 ? (
          <FilterChips options={months.map((month) => ({ value: month, label: monthLabel(t, month) }))} active={activeMonth ? [activeMonth] : []} onToggle={setChosenMonth} />
        ) : null
      }
    />
  );
};

export default MajorReleasesSection;
