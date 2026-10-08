import { useTranslation } from "react-i18next";
import SeriesRailSection from "@/components/organisms/SeriesRailSection";
import type { PageDashboard, Section } from "@/actions/helpers/section";
import type { MediaItem } from "@/types/media";

interface BestRatedOnRailProps {
  dashboard: PageDashboard;
  provider: { id: number; label: string };
  titleKey: string; // chave de tradução do título ("Melhor avaliadas no {{provider}}")
  useBestRatedOn: (dashboard: PageDashboard, providerId: number) => Section<MediaItem>; // a função da section da página (Séries ou Animes)
}

// Fileira "Melhor avaliadas no <streaming>": cada streaming pede os próprios dados.
const BestRatedOnRail = ({ dashboard, provider, titleKey, useBestRatedOn }: BestRatedOnRailProps) => {
  const { t } = useTranslation();
  const rail = useBestRatedOn(dashboard, provider.id);

  return <SeriesRailSection title={t(titleKey, { provider: provider.label })} items={rail.items} loading={rail.loading} error={rail.error} />;
};

export default BestRatedOnRail;
