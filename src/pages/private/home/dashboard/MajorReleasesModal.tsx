// src/pages/private/home/dashboard/MajorReleasesModal.tsx
// "Ver tudo" da fileira "Principais lançamentos dos últimos 12 meses" —
// pedido explícito da Rebecca: "coloca um botão ver tudo ali, nos
// lançamentos dos ultimos 12 meses, os fillmes deve estar agrupados por
// mes". A fileira em si (`index.tsx`) mostra só os 20 primeiros
// (MAJOR_RELEASES_LIMIT) num scroll horizontal; esse modal agrupa a
// lista INTEIRA (`majorReleasesFull`, até MAJOR_RELEASES_MODAL_LIMIT=120)
// em seções por mês — ordem mais recente primeiro, já que é "dos últimos
// 12 meses pra trás".
//
// SEM busca própria — recebe `movies`/`error` por prop, já resolvidos
// (e cacheados, service/PageCache.ts) pelo `index.tsx`, que busca essa
// lista grande UMA vez, junto com o resto da home. ANTES esse componente
// buscava sozinho ao montar (só quando clicado) — pedido explícito da
// Rebecca pra mudar: "o modal ver tudo... tem que ser cacheado... e tem
// que loadar junto com o inicio da página" (também elimina uma duplicata
// real: a fileira e esse modal buscavam, cada um por conta própria,
// basicamente os MESMOS primeiros filmes — ver comentário longo em
// `majorReleasesFull`, index.tsx).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Loader2, Play, X } from "lucide-react";
import { ConnectedMediaCard, cardKey, useOpenCard } from "@/components/mediaCard";
import type { MajorReleaseMovie } from "./functions";
import "./styles.scss";

interface MajorReleasesModalProps {
  movies: MajorReleaseMovie[] | null;
  error: string | null;
  onClose: () => void;
}

// `yyyymm` no formato "YYYY-MM" (recorte de `releaseDate`, que já vem
// "YYYY-MM-DD" do TMDb). Nomes de mês + ordem "mês de ano" vêm de
// `t()` (array `majorReleasesModal.months` + `monthYearFormat` — a ordem
// muda por idioma, ex. inglês não usa "de").
const monthLabel = (t: TFunction, yyyymm: string): string => {
  const [year, month] = yyyymm.split("-").map(Number);
  const monthName = t("dashboard.majorReleasesModal.months", { returnObjects: true }) as string[];
  return t("dashboard.majorReleasesModal.monthYearFormat", { month: monthName[month - 1], year });
};

interface MonthGroup {
  key: string;
  label: string;
  movies: MajorReleaseMovie[];
}

// Mais recente primeiro — dentro de cada mês, mantém a ordem que já veio
// de `fetchRecentMajorReleases` (popularidade), não reordena de novo.
const groupByMonth = (t: TFunction, movies: MajorReleaseMovie[]): MonthGroup[] => {
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

// Filtro "Tudo"/"Disponível" — pedido explícito da Rebecca: "vamos
// colocar um filtro, nesse modal de ver tudo, para filtrar so o que
// tiver com claquete ou tudo". Client-side, sobre a lista já carregada
// (não refaz a busca — `available` já veio resolvido junto de cada
// filme, `fetchRecentMajorReleases`).
type AvailabilityFilter = "all" | "available";

// Grade de UM mês — cada mês tem o próprio "um card aberto por vez".
const MonthGrid = ({ movies }: { movies: MajorReleaseMovie[] }) => {
  const open = useOpenCard(movies);
  return (
    <div className="media-grid media-grid--modal">
      {movies.map((movie, index) => {
        const id = cardKey(movie, index);
        return <ConnectedMediaCard isModal key={id} item={movie} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} available={movie.available} />;
      })}
    </div>
  );
};

const MajorReleasesModal = ({ movies, error, onClose }: MajorReleasesModalProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<AvailabilityFilter>("all");

  const filteredMovies = movies ? (filter === "available" ? movies.filter((m) => m.available) : movies) : null;
  const groups = filteredMovies ? groupByMonth(t, filteredMovies) : [];

  return (
    <div className="dashboard__major-releases-overlay" onClick={onClose}>
      <div className="dashboard__major-releases-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dashboard__major-releases-close" onClick={onClose} aria-label={t("close")}>
          <X size={20} />
        </button>

        <h2 className="dashboard__major-releases-title">{t("dashboard.majorReleasesModal.title")}</h2>

        {movies !== null && (
          <div className="dashboard__major-releases-filter" role="group" aria-label={t("dashboard.majorReleasesModal.filterAriaLabel")}>
            <button
              type="button"
              className={filter === "all" ? "dashboard__major-releases-filter-btn dashboard__major-releases-filter-btn--active" : "dashboard__major-releases-filter-btn"}
              onClick={() => setFilter("all")}
            >
              {t("dashboard.majorReleasesModal.filterAll")}
            </button>
            <button
              type="button"
              className={filter === "available" ? "dashboard__major-releases-filter-btn dashboard__major-releases-filter-btn--active" : "dashboard__major-releases-filter-btn"}
              onClick={() => setFilter("available")}
            >
              <Play size={12} fill="currentColor" /> {t("dashboard.majorReleasesModal.filterAvailable")}
            </button>
          </div>
        )}

        {movies !== null && filteredMovies !== null && filteredMovies.length === 0 && (
          <p className="dashboard__empty">{t("dashboard.majorReleasesModal.emptyAvailable")}</p>
        )}

        {movies === null && !error && (
          <p className="dashboard__loading">
            <Loader2 className="dashboard__spinner" size={18} />
            {t("dashboard.loading")}
          </p>
        )}
        {error && <p className="dashboard__error">{error}</p>}

        {groups.map((group) => (
          <section key={group.key} className="dashboard__major-releases-group">
            <h3 className="dashboard__major-releases-month">{group.label}</h3>
            <MonthGrid movies={group.movies} />
          </section>
        ))}
      </div>
    </div>
  );
};

export default MajorReleasesModal;
