import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";
import MediaGrid from "@/components/atoms/MediaGrid";
import Modal from "@/components/atoms/Modal";
import StatusMessage from "@/components/atoms/StatusMessage";
import MediaCard from "@/components/molecules/MediaCard";
import { groupByMonth } from "@/actions/movies/majorreleases";
import { cardKey, useOpenCard } from "@/actions/helpers/opencard";
import type { MajorReleaseMovie } from "@/types/media";
import "./style.scss";

interface MajorReleasesModalProps {
  movies: MajorReleaseMovie[] | null;
  error: string | null;
  onClose: () => void;
}

type AvailabilityFilter = "all" | "available";

// Cada mês tem a própria grade, com "um card aberto por vez" independente.
const MonthGrid = ({ movies }: { movies: MajorReleaseMovie[] }) => {
  const open = useOpenCard(movies);
  return (
    <MediaGrid variant="modal">
      {movies.map((movie, index) => {
        const id = cardKey(movie, index);
        return <MediaCard isModal key={id} item={movie} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
      })}
    </MediaGrid>
  );
};

// "Ver até 12 meses": lançamentos agrupados por mês, com filtro Tudo / Disponível.
const MajorReleasesModal = ({ movies, error, onClose }: MajorReleasesModalProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<AvailabilityFilter>("all");

  const filteredMovies = movies ? (filter === "available" ? movies.filter((m) => m.available) : movies) : null;
  const groups = filteredMovies ? groupByMonth(t, filteredMovies) : [];

  return (
    <Modal onClose={onClose} size="xl" title={t("dashboard.majorReleasesModal.title")}>
      {movies !== null && (
        <div className="major-releases-modal__filter" role="group" aria-label={t("dashboard.majorReleasesModal.filterAriaLabel")}>
          <button
            type="button"
            className={filter === "all" ? "major-releases-modal__filter-btn major-releases-modal__filter-btn--active" : "major-releases-modal__filter-btn"}
            onClick={() => setFilter("all")}
          >
            {t("dashboard.majorReleasesModal.filterAll")}
          </button>
          <button
            type="button"
            className={filter === "available" ? "major-releases-modal__filter-btn major-releases-modal__filter-btn--active" : "major-releases-modal__filter-btn"}
            onClick={() => setFilter("available")}
          >
            <Play size={12} fill="currentColor" /> {t("dashboard.majorReleasesModal.filterAvailable")}
          </button>
        </div>
      )}

      {movies !== null && filteredMovies !== null && filteredMovies.length === 0 && <StatusMessage variant="empty">{t("dashboard.majorReleasesModal.emptyAvailable")}</StatusMessage>}
      {movies === null && !error && (
        <StatusMessage variant="loading" spinner>
          {t("dashboard.loading")}
        </StatusMessage>
      )}
      {error && <StatusMessage variant="error">{error}</StatusMessage>}

      {groups.map((group) => (
        <section key={group.key} className="major-releases-modal__group">
          <h3 className="major-releases-modal__month">{group.label}</h3>
          <MonthGrid movies={group.movies} />
        </section>
      ))}
    </Modal>
  );
};

export default MajorReleasesModal;
