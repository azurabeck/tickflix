// src/components/movieDetail/index.tsx
// Modal de detalhes — abre por cima de qualquer tela ao clicar num pôster
// (timeline, últimos vistos, em cartaz, bilheteria, busca do rodapé).
// Um único componente reusado em todo canto: quem abre só precisa passar
// id + mediaType (`<MovieDetail id={movie.id} mediaType={movie.mediaType}
// onClose={...} />`), a busca de "todos os detalhes" fica aqui.
//
// `MovieDetailHeader`/`MovieDetailCast`/`MovieDetailProviders` são
// exportados separados (não só usados aqui dentro) — pedido explícito da
// Rebecca: o dialog de episódios da página Séries
// (@/pages/private/series/SeriesDetail.tsx) queria "os detalhes" (a
// mesma sinopse/elenco/onde assistir de sempre) JUNTO com a lista de
// episódios, não um modal genérico separado do de marcar episódio. Em
// vez de duplicar esse JSX lá, `SeriesDetail` importa e reusa essas três
// peças, encaixando a lista de temporadas entre a sinopse e o elenco.
import { useEffect, useState } from "react";
import { Loader2, Star, X } from "lucide-react";
import { TMDB_BACKDROP_BASE, TMDB_LOGO_BASE, TMDB_PROFILE_BASE, posterUrl } from "@/service/TMDbSettings";
import { fetchCurrentLocation } from "@/service/LocationSettings";
import {
  fetchMovieDetail,
  fetchWatchProviders,
  formatRuntime,
  type MovieDetail as MovieDetailData,
  type WatchProvider,
  type WatchProviders,
} from "./functions";
import "./styles.scss";

interface MovieDetailProps {
  id: number;
  mediaType: "movie" | "tv";
  onClose: () => void;
}

// Sem localização (permissão negada/indisponível), assume Brasil — mesmo
// fallback já usado em "Em cartaz" (service/IngressoSettings.ts).
const DEFAULT_COUNTRY_CODE = "BR";

// --- Backdrop + pôster + título/tagline/meta/gêneros/criação/sinopse ---------
export const MovieDetailHeader = ({ detail }: { detail: MovieDetailData }) => {
  const backdrop = detail.backdropPath ? `${TMDB_BACKDROP_BASE}${detail.backdropPath}` : null;
  const poster = posterUrl(detail.posterPath);
  const runtime = formatRuntime(detail.runtimeMinutes);
  const year = detail.releaseDate ? detail.releaseDate.slice(0, 4) : null;

  return (
    <>
      <div className="movie-detail__backdrop" style={backdrop ? { backgroundImage: `url(${backdrop})` } : undefined}>
        <div className="movie-detail__backdrop-fade" />
      </div>

      <div className="movie-detail__body">
        {poster ? (
          <img src={poster} alt={detail.title} className="movie-detail__poster" />
        ) : (
          <div className="movie-detail__poster movie-detail__poster--empty" />
        )}

        <div className="movie-detail__info">
          <h2 className="movie-detail__title">{detail.title}</h2>
          {detail.tagline && <p className="movie-detail__tagline">{detail.tagline}</p>}

          <div className="movie-detail__meta">
            {year && <span>{year}</span>}
            {runtime && <span>{runtime}</span>}
            {detail.mediaType === "tv" && detail.seasons && (
              <span>
                {detail.seasons} temporada{detail.seasons === 1 ? "" : "s"} · {detail.episodes} episódios
              </span>
            )}
            {detail.voteAverage > 0 && (
              <span className="movie-detail__rating">
                <Star size={14} fill="currentColor" />
                {detail.voteAverage.toFixed(1)} ({detail.voteCount})
              </span>
            )}
            {detail.status && <span>{detail.status}</span>}
          </div>

          {detail.genres.length > 0 && (
            <div className="movie-detail__genres">
              {detail.genres.map((genre) => (
                <span key={genre} className="movie-detail__genre-tag">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {detail.directors.length > 0 && (
            <p className="movie-detail__directors">
              {detail.mediaType === "movie" ? "Direção" : "Criação"}: {detail.directors.join(", ")}
            </p>
          )}

          {detail.overview && <p className="movie-detail__overview">{detail.overview}</p>}
        </div>
      </div>
    </>
  );
};

// --- Elenco -------------------------------------------------------------------
export const MovieDetailCast = ({ cast }: { cast: MovieDetailData["cast"] }) => {
  if (cast.length === 0) return null;

  return (
    <div className="movie-detail__cast">
      <h3 className="movie-detail__cast-title">Elenco</h3>
      <div className="movie-detail__cast-row">
        {cast.map((member) => {
          const profile = member.profilePath ? `${TMDB_PROFILE_BASE}${member.profilePath}` : null;
          return (
            <div key={member.id} className="movie-detail__cast-member">
              {profile ? (
                <img src={profile} alt={member.name} className="movie-detail__cast-photo" />
              ) : (
                <div className="movie-detail__cast-photo movie-detail__cast-photo--empty" />
              )}
              <span className="movie-detail__cast-name">{member.name}</span>
              <span className="movie-detail__cast-character">{member.character}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Onde assistir --------------------------------------------------------------
interface MovieDetailProvidersProps {
  providersLoading: boolean;
  providers: WatchProviders | null;
}

export const MovieDetailProviders = ({ providersLoading, providers }: MovieDetailProvidersProps) => (
  <div className="movie-detail__providers">
    <h3 className="movie-detail__providers-title">Onde assistir</h3>

    {providersLoading && <p className="movie-detail__providers-loading">Verificando disponibilidade...</p>}

    {!providersLoading && !providers && (
      <p className="movie-detail__providers-empty">Não encontramos onde assistir esse título na sua região agora.</p>
    )}

    {!providersLoading && providers && (
      <>
        <ProviderGroup label="Streaming" list={providers.flatrate} />
        <ProviderGroup label="Alugar" list={providers.rent} />
        <ProviderGroup label="Comprar" list={providers.buy} />

        {providers.flatrate.length === 0 && providers.rent.length === 0 && providers.buy.length === 0 && (
          <p className="movie-detail__providers-empty">Não encontramos onde assistir esse título na sua região agora.</p>
        )}

        {providers.link && (
          <a href={providers.link} target="_blank" rel="noopener noreferrer" className="movie-detail__providers-attribution">
            Dados fornecidos por JustWatch
          </a>
        )}
      </>
    )}
  </div>
);

// Uma linha por tipo de acesso (streaming/alugar/comprar) — não renderiza
// nada se aquele tipo não tiver provedor nenhum pra esse título+país.
const ProviderGroup = ({ label, list }: { label: string; list: WatchProvider[] }) => {
  if (list.length === 0) return null;

  return (
    <div className="movie-detail__providers-group">
      <span className="movie-detail__providers-group-label">{label}</span>
      <div className="movie-detail__providers-logos">
        {list.map((provider) =>
          provider.logoPath ? (
            <img
              key={provider.id}
              src={`${TMDB_LOGO_BASE}${provider.logoPath}`}
              alt={provider.name}
              title={provider.name}
              className="movie-detail__provider-logo"
            />
          ) : (
            <span key={provider.id} title={provider.name} className="movie-detail__provider-logo movie-detail__provider-logo--empty">
              {provider.name.slice(0, 1)}
            </span>
          )
        )}
      </div>
    </div>
  );
};

// --- Modal (busca detail+providers, compõe as três peças acima) --------------
const MovieDetail = ({ id, mediaType, onClose }: MovieDetailProps) => {
  const [detail, setDetail] = useState<MovieDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<WatchProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);

    fetchMovieDetail(id, mediaType)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        console.error("Erro ao buscar detalhes do título:", err);
        if (!cancelled) setError("Não foi possível carregar os detalhes agora.");
      });

    setProviders(null);
    setProvidersLoading(true);
    fetchCurrentLocation()
      .then(({ countryCode }) => fetchWatchProviders(id, mediaType, countryCode ?? DEFAULT_COUNTRY_CODE))
      .then((data) => {
        if (!cancelled) setProviders(data);
      })
      .catch((err) => {
        // Onde assistir é um extra, não o dado principal do modal — uma
        // falha aqui não deve travar o resto do detalhe.
        console.error("Erro ao buscar onde assistir:", err);
      })
      .finally(() => {
        if (!cancelled) setProvidersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, mediaType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="movie-detail__overlay" onClick={onClose}>
      <div className="movie-detail__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="movie-detail__close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        {!detail && !error && (
          <p className="movie-detail__loading">
            <Loader2 className="movie-detail__spinner" size={20} />
            Carregando detalhes...
          </p>
        )}

        {error && <p className="movie-detail__error">{error}</p>}

        {detail && (
          <>
            <MovieDetailHeader detail={detail} />
            <MovieDetailCast cast={detail.cast} />
            <MovieDetailProviders providersLoading={providersLoading} providers={providers} />
          </>
        )}
      </div>
    </div>
  );
};

export default MovieDetail;
