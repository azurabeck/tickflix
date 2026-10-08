import { useTranslation } from "react-i18next";
import PosterGridModal from "@/components/organisms/PosterGridModal";
import { MODAL_LIMIT, useRecentlyWatched } from "@/actions/movies/recentlywatched";

// "Tudo que você viu": os 60 filmes vistos mais recentes.
const RecentlyWatchedModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const { items } = useRecentlyWatched(MODAL_LIMIT);

  return <PosterGridModal title={t("dashboard.watchedAllTitle")} items={items} emptyMessage={t("dashboard.watchedAllEmpty")} onClose={onClose} />;
};

export default RecentlyWatchedModal;
