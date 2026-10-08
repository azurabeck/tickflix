import ProviderGroup from "@/components/atoms/ProviderGroup";
import type { WatchProviders } from "@/actions/helpers/moviedetail";
import "./style.scss";

interface MovieDetailProvidersProps {
  providersLoading: boolean;
  providers: WatchProviders | null;
}

const MovieDetailProviders = ({ providersLoading, providers }: MovieDetailProvidersProps) => {
  const noneFound = providers && providers.flatrate.length === 0 && providers.rent.length === 0 && providers.buy.length === 0;

  return (
    <div className="movie-detail-providers">
      <h3 className="movie-detail-providers__title">Onde assistir</h3>

      {providersLoading && <p className="movie-detail-providers__loading">Verificando disponibilidade...</p>}

      {!providersLoading && !providers && <p className="movie-detail-providers__empty">Não encontramos onde assistir esse título na sua região agora.</p>}

      {!providersLoading && providers && (
        <>
          <ProviderGroup label="Streaming" list={providers.flatrate} />
          <ProviderGroup label="Alugar" list={providers.rent} />
          <ProviderGroup label="Comprar" list={providers.buy} />

          {noneFound && <p className="movie-detail-providers__empty">Não encontramos onde assistir esse título na sua região agora.</p>}

          {providers.link && (
            <a href={providers.link} target="_blank" rel="noopener noreferrer" className="movie-detail-providers__attribution">
              Dados fornecidos por JustWatch
            </a>
          )}
        </>
      )}
    </div>
  );
};

export default MovieDetailProviders;
