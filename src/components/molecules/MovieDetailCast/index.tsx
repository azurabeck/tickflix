import type { MovieDetail } from "@/actions/helpers/moviedetail";
import { TMDB_PROFILE_BASE } from "@/service/TMDbSettings";
import "./style.scss";

const MovieDetailCast = ({ cast }: { cast: MovieDetail["cast"] }) => {
  if (cast.length === 0) return null;

  return (
    <div className="movie-detail-cast">
      <h3 className="movie-detail-cast__title">Elenco</h3>
      <div className="movie-detail-cast__row">
        {cast.map((member) => {
          const profile = member.profilePath ? `${TMDB_PROFILE_BASE}${member.profilePath}` : null;
          return (
            <div key={member.id} className="movie-detail-cast__member">
              {profile ? (
                <img src={profile} alt={member.name} className="movie-detail-cast__photo" />
              ) : (
                <div className="movie-detail-cast__photo movie-detail-cast__photo--empty" />
              )}
              <span className="movie-detail-cast__name">{member.name}</span>
              <span className="movie-detail-cast__character">{member.character}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MovieDetailCast;
