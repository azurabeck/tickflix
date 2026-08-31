// src/pages/private/timelines/TimelineDetail.tsx
// Dialog que abre ao clicar num card de timeline — grade de filmes com
// botão "Marcar como visto"/ícone de check. É um MODAL de verdade
// (overlay por cima da página, mesmo padrão de @/components/movieDetail)
// — nunca substitui a tela.
//
// "Visto" é estado GLOBAL por filme agora (service/WatchedSettings.ts),
// não gravado dentro do doc da timeline — quem chama (página Timelines
// OU a Home, pra timeline seguida) é quem carrega o Map e o handler
// (`onToggleWatched`), esse componente só lê/dispara, igual
// `EditionDetail` da página Oscar faz com a mesma marcação. Importa o
// próprio CSS (não confia em quem renderiza já ter importado
// styles.scss) já que agora abre a partir de duas páginas.
import { useState } from "react";
import { X } from "lucide-react";
import { timelineMovieKey, type Timeline, type TimelineMovie } from "@/service/TimelineSettings";
import { posterUrl } from "@/service/TMDbSettings";
import MovieDetail from "@/components/movieDetail";
import WatchButton from "@/components/watchButton";
import "./styles.scss";

interface TimelineDetailProps {
  timeline: Timeline;
  watchedMap: Map<string, number>;
  uid: string | null;
  onClose: () => void;
  onToggleWatched: (movie: TimelineMovie) => void;
}

const TimelineDetail = ({ timeline, watchedMap, uid, onClose, onToggleWatched }: TimelineDetailProps) => {
  const [selectedMovie, setSelectedMovie] = useState<TimelineMovie | null>(null);

  const watchedCount = timeline.movies.filter((movie) => watchedMap.has(timelineMovieKey(movie))).length;
  const pct = timeline.movies.length === 0 ? 0 : Math.round((watchedCount / timeline.movies.length) * 100);

  return (
    <div className="timelines-page__detail-overlay" onClick={onClose}>
      <div className="timelines-page__detail-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="timelines-page__detail-close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <div className="timelines-page__detail-header">
          <h2 className="timelines-page__detail-title">{timeline.name}</h2>
          <span className="timelines-page__detail-progress">
            visto: {watchedCount}/{timeline.movies.length} ({pct}%)
          </span>
        </div>

        <div className="timelines-page__movie-grid">
          {timeline.movies.map((movie) => {
            const key = timelineMovieKey(movie);
            const poster = posterUrl(movie.posterPath);
            const isWatched = watchedMap.has(key);

            return (
              <div key={key} className={isWatched ? "timelines-page__movie timelines-page__movie--watched" : "timelines-page__movie"}>
                <button type="button" className="timelines-page__movie-open" onClick={() => setSelectedMovie(movie)}>
                  {poster ? (
                    <img src={poster} alt={movie.title} className="timelines-page__movie-poster" />
                  ) : (
                    <div className="timelines-page__movie-poster timelines-page__movie-poster--empty" />
                  )}
                  <span className="timelines-page__movie-title">
                    {movie.title} {movie.year && `(${movie.year})`}
                  </span>
                </button>
                <WatchButton isWatched={isWatched} onToggle={() => onToggleWatched(movie)} disabled={!uid} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Intercepta o clique aqui — sem isso, fechar o MovieDetail (que
          também fecha ao clicar fora) borbulhava pro overlay deste
          dialog e fechava os dois de uma vez só. */}
      {selectedMovie && (
        <div onClick={(e) => e.stopPropagation()}>
          <MovieDetail id={selectedMovie.id} mediaType={selectedMovie.mediaType} onClose={() => setSelectedMovie(null)} />
        </div>
      )}
    </div>
  );
};

export default TimelineDetail;
