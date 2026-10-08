import DetailPanel from "@/components/atoms/DetailPanel";
import MovieDetailCast from "@/components/molecules/MovieDetailCast";
import MovieDetailHeader from "@/components/molecules/MovieDetailHeader";
import MovieDetailProviders from "@/components/molecules/MovieDetailProviders";
import { useMovieDetail } from "@/actions/helpers/moviedetail";

interface MovieDetailProps {
  id: number;
  mediaType: "movie" | "tv";
  onClose: () => void;
}

// Detalhe de filme ou série: capa, elenco e onde assistir.
const MovieDetail = ({ id, mediaType, onClose }: MovieDetailProps) => {
  const { detail, error, providers, providersLoading } = useMovieDetail(id, mediaType);

  return (
    <DetailPanel onClose={onClose} loading={!detail && !error} error={error}>
      {detail && (
        <>
          <MovieDetailHeader detail={detail} />
          <MovieDetailCast cast={detail.cast} />
          <MovieDetailProviders providersLoading={providersLoading} providers={providers} />
        </>
      )}
    </DetailPanel>
  );
};

export default MovieDetail;
