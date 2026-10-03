// src/components/suggestionCard/ConnectedSuggestionCard.tsx
// O card de sugestão ligado ao estado global (MediaCardsProvider): descobre o
// tipo (filme → check "assisti"; série/anime → "estou assistindo"), a
// disponibilidade, e liga detalhe/trailer/check às ações globais.
import { cardTypeOf, useMediaCards } from "@/components/mediaCard";
import { movieKey } from "@/service/TimelineSettings";
import SuggestionCard from "./SuggestionCard";

interface ConnectedSuggestionCardProps {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  // Série/anime: em qual lista o check segue o título. Padrão "series".
  category?: "series" | "animes";
}

const ConnectedSuggestionCard = ({ id, mediaType, title, posterPath, category }: ConnectedSuggestionCardProps) => {
  const media = useMediaCards();

  return (
    <SuggestionCard
      type={cardTypeOf({ mediaType })}
      id={id}
      mediaType={mediaType}
      title={title}
      posterPath={posterPath}
      uid={media.uid}
      isAvailable={media.availabilityMap.has(movieKey(mediaType, id))}
      isChecked={media.isChecked({ id, mediaType })}
      onOpenDetail={() => media.openDetail({ id, mediaType })}
      onPlayTrailer={() => media.playTrailer({ id, mediaType, title })}
      onToggleChecked={() => media.toggleChecked({ id, mediaType, title, posterPath, category })}
    />
  );
};

export default ConnectedSuggestionCard;
