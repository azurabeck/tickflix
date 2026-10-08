import { useState } from "react";
import { Clapperboard, Star } from "lucide-react";
import TrailerPlayer from "@/components/atoms/TrailerPlayer";
import { formatRuntime, type MovieDetail } from "@/actions/helpers/moviedetail";
import { TMDB_BACKDROP_BASE, posterUrl } from "@/service/TMDbSettings";
import "./style.scss";

const MovieDetailHeader = ({ detail }: { detail: MovieDetail }) => {
  const backdrop = detail.backdropPath ? `${TMDB_BACKDROP_BASE}${detail.backdropPath}` : null;
  const poster = posterUrl(detail.posterPath);
  const runtime = formatRuntime(detail.runtimeMinutes);
  const year = detail.releaseDate ? detail.releaseDate.slice(0, 4) : null;
  const [trailerOpen, setTrailerOpen] = useState(false);

  return (
    <>
      <div className="movie-detail-header__backdrop" style={backdrop ? { backgroundImage: `url(${backdrop})` } : undefined}>
        <div className="movie-detail-header__backdrop-fade" />
      </div>

      <div className="movie-detail-header__body">
        {poster ? (
          <img src={poster} alt={detail.title} className="movie-detail-header__poster" />
        ) : (
          <div className="movie-detail-header__poster movie-detail-header__poster--empty" />
        )}

        <div className="movie-detail-header__info">
          <h2 className="movie-detail-header__title">{detail.title}</h2>
          {detail.tagline && <p className="movie-detail-header__tagline">{detail.tagline}</p>}

          <div className="movie-detail-header__meta">
            {year && <span>{year}</span>}
            {runtime && <span>{runtime}</span>}
            {detail.mediaType === "tv" && detail.seasons && (
              <span>
                {detail.seasons} temporada{detail.seasons === 1 ? "" : "s"} · {detail.episodes} episódios
              </span>
            )}
            {detail.voteAverage > 0 && (
              <span className="movie-detail-header__rating">
                <Star size={14} fill="currentColor" />
                {detail.voteAverage.toFixed(1)} ({detail.voteCount})
              </span>
            )}
            {detail.status && <span>{detail.status}</span>}
          </div>

          {(detail.genres.length > 0 || detail.trailerKey) && (
            <div className="movie-detail-header__genres">
              {detail.trailerKey && (
                <button type="button" className="movie-detail-header__trailer-tag" onClick={() => setTrailerOpen(true)}>
                  <Clapperboard size={12} />
                  Trailer
                </button>
              )}
              {detail.genres.map((genre) => (
                <span key={genre} className="movie-detail-header__genre-tag">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {trailerOpen && detail.trailerKey && <TrailerPlayer youtubeKey={detail.trailerKey} title={detail.title} onClose={() => setTrailerOpen(false)} />}

          {detail.originalTitle && detail.originalTitle !== detail.title && <p className="movie-detail-header__original-title">Nome original: {detail.originalTitle}</p>}

          {detail.directors.length > 0 && (
            <p className="movie-detail-header__directors">
              {detail.mediaType === "movie" ? "Direção" : "Criação"}: {detail.directors.join(", ")}
            </p>
          )}

          {detail.overview && <p className="movie-detail-header__overview">{detail.overview}</p>}
        </div>
      </div>
    </>
  );
};

export default MovieDetailHeader;
