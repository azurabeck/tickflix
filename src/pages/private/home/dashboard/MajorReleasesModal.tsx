// src/pages/private/home/dashboard/MajorReleasesModal.tsx
// "Ver tudo" da fileira "Principais lançamentos dos últimos 12 meses" —
// pedido explícito da Rebecca: "coloca um botão ver tudo ali, nos
// lançamentos dos ultimos 12 meses, os fillmes deve estar agrupados por
// mes". A fileira em si (`index.tsx`) mostra só os 20 primeiros
// (MAJOR_RELEASES_LIMIT) num scroll horizontal; esse modal busca uma
// lista bem maior (MODAL_LIMIT) e agrupa em seções por mês — ordem mais
// recente primeiro, já que é "dos últimos 12 meses pra trás".
//
// Busca PRÓPRIA (não reaproveita o resultado da fileira) — abre só
// quando clicado (`fetchRecentMajorReleases(MODAL_LIMIT)` no mount deste
// componente, não no mount da Home), evita pagar o custo de
// `/watch/providers` por ~100 filmes pra quem nunca clica em "Ver tudo".
import { useEffect, useState } from "react";
import { Clapperboard, Loader2, X } from "lucide-react";
import { movieKey } from "@/service/TimelineSettings";
import { posterUrl } from "@/service/TMDbSettings";
import WatchButton from "@/components/watchButton";
import AvailabilityBadge from "@/components/availabilityBadge";
import { fetchRecentMajorReleases, type MajorReleaseMovie } from "./functions";
import "./styles.scss";

interface MajorReleasesModalProps {
  watchedMap: Map<string, number>;
  uid: string | null;
  onClose: () => void;
  onSelectMovie: (movie: { id: number; mediaType: "movie" | "tv" }) => void;
  onToggleWatched: (movie: MajorReleaseMovie) => void;
}

// Bem mais que os 20 da fileira — "ver tudo" de verdade, com densidade
// real em cada mês depois de agrupar (ver `releasesCandidatePages` em
// functions.ts, que escala o teto de páginas do TMDb junto com isso).
const MODAL_LIMIT = 120;

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// `yyyymm` no formato "YYYY-MM" (recorte de `releaseDate`, que já vem
// "YYYY-MM-DD" do TMDb).
const monthLabel = (yyyymm: string): string => {
  const [year, month] = yyyymm.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} de ${year}`;
};

interface MonthGroup {
  key: string;
  label: string;
  movies: MajorReleaseMovie[];
}

// Mais recente primeiro — dentro de cada mês, mantém a ordem que já veio
// de `fetchRecentMajorReleases` (popularidade), não reordena de novo.
const groupByMonth = (movies: MajorReleaseMovie[]): MonthGroup[] => {
  const byMonth = new Map<string, MajorReleaseMovie[]>();
  for (const movie of movies) {
    const key = movie.releaseDate.slice(0, 7);
    const group = byMonth.get(key);
    if (group) group.push(movie);
    else byMonth.set(key, [movie]);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupMovies]) => ({ key, label: monthLabel(key), movies: groupMovies }));
};

// Filtro "Tudo"/"Disponível" — pedido explícito da Rebecca: "vamos
// colocar um filtro, nesse modal de ver tudo, para filtrar so o que
// tiver com claquete ou tudo". Client-side, sobre a lista já carregada
// (não refaz a busca — `available` já veio resolvido junto de cada
// filme, `fetchRecentMajorReleases`).
type AvailabilityFilter = "all" | "available";

const MajorReleasesModal = ({ watchedMap, uid, onClose, onSelectMovie, onToggleWatched }: MajorReleasesModalProps) => {
  const [movies, setMovies] = useState<MajorReleaseMovie[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AvailabilityFilter>("all");

  useEffect(() => {
    let cancelled = false;
    fetchRecentMajorReleases(MODAL_LIMIT)
      .then((result) => {
        if (!cancelled) setMovies(result);
      })
      .catch((err) => {
        console.error("Erro ao buscar todos os lançamentos:", err);
        if (!cancelled) setError("Não foi possível carregar a lista completa.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredMovies = movies ? (filter === "available" ? movies.filter((m) => m.available) : movies) : null;
  const groups = filteredMovies ? groupByMonth(filteredMovies) : [];

  return (
    <div className="dashboard__major-releases-overlay" onClick={onClose}>
      <div className="dashboard__major-releases-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dashboard__major-releases-close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <h2 className="dashboard__major-releases-title">Principais lançamentos dos últimos 12 meses</h2>

        {movies !== null && (
          <div className="dashboard__major-releases-filter" role="group" aria-label="Filtrar por disponibilidade">
            <button
              type="button"
              className={filter === "all" ? "dashboard__major-releases-filter-btn dashboard__major-releases-filter-btn--active" : "dashboard__major-releases-filter-btn"}
              onClick={() => setFilter("all")}
            >
              Tudo
            </button>
            <button
              type="button"
              className={filter === "available" ? "dashboard__major-releases-filter-btn dashboard__major-releases-filter-btn--active" : "dashboard__major-releases-filter-btn"}
              onClick={() => setFilter("available")}
            >
              <Clapperboard size={13} /> Disponível
            </button>
          </div>
        )}

        {movies !== null && filteredMovies !== null && filteredMovies.length === 0 && (
          <p className="dashboard__empty">Nenhum lançamento disponível em streaming ou aluguel ainda.</p>
        )}

        {movies === null && !error && (
          <p className="dashboard__loading">
            <Loader2 className="dashboard__spinner" size={18} />
            Carregando...
          </p>
        )}
        {error && <p className="dashboard__error">{error}</p>}

        {groups.map((group) => (
          <section key={group.key} className="dashboard__major-releases-group">
            <h3 className="dashboard__major-releases-month">{group.label}</h3>
            <div className="dashboard__major-releases-grid">
              {group.movies.map((movie) => {
                const poster = posterUrl(movie.posterPath);
                const isWatched = watchedMap.has(movieKey(movie.mediaType, movie.id));

                return (
                  <div key={movie.id} className="dashboard__major-releases-item">
                    <button
                      type="button"
                      className="dashboard__major-releases-item-open"
                      onClick={() => onSelectMovie({ id: movie.id, mediaType: movie.mediaType })}
                    >
                      {poster ? (
                        <img src={poster} alt={movie.title} className="dashboard__major-releases-poster" />
                      ) : (
                        <div className="dashboard__major-releases-poster dashboard__major-releases-poster--empty" />
                      )}
                      <AvailabilityBadge available={movie.available} />
                      <span className="dashboard__major-releases-item-title">{movie.title}</span>
                    </button>
                    <WatchButton isWatched={isWatched} onToggle={() => onToggleWatched(movie)} disabled={!uid} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default MajorReleasesModal;
