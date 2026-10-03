// src/components/suggestionCard/SuggestionCard.tsx
// COMPONENTE GLOBAL de card de SUGESTÃO (Figma da Rebecca): o pôster
// inteiro (retrato, 208x295 — o tamanho dos pôsteres da "Sugestão da IA") com
// um degradê roxo → transparente no rodapé, em 2 colunas:
//
//   [📺 disponível]                 [＋ timeline] [▷ trailer] [✓ visto]
//
//   esquerda ... o ícone de "disponível em streaming/aluguel" (só aparece se
//                estiver disponível)
//   direita .... ＋ adicionar a uma timeline (existente ou nova), trailer e
//                o check — que, como no MediaCard, é "assisti" pra filme e
//                "estou assistindo" pra série/anime
//
// Clicar na imagem abre o detalhe. Normalmente se usa o
// `ConnectedSuggestionCard`, que já liga o card ao estado global.
import { CheckCircleIcon, PlayCircleIcon, TvIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { useTranslation } from "react-i18next";
import AddToTimelineButton from "@/components/addToTimelineButton";
import { posterUrl as resolvePosterUrl } from "@/service/TMDbSettings";
import type { MediaCardType } from "@/components/mediaCard/types";
import "./styles.scss";

export interface SuggestionCardProps {
  type: MediaCardType;
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  uid: string | null;
  isAvailable: boolean;
  // movie: já assisti · serie: estou assistindo.
  isChecked: boolean;
  onOpenDetail: () => void;
  onPlayTrailer: () => void;
  onToggleChecked: () => void;
}

const SuggestionCard = ({ type, id, mediaType, title, posterPath, uid, isAvailable, isChecked, onOpenDetail, onPlayTrailer, onToggleChecked }: SuggestionCardProps) => {
  const { t } = useTranslation();
  const poster = resolvePosterUrl(posterPath);
  const isSerie = type === "serie";
  const checkLabel = t(isSerie ? (isChecked ? "card.unmarkFollowing" : "card.markFollowing") : isChecked ? "card.unmarkWatched" : "card.markWatched");

  return (
    <div className="suggestion-card">
      <button type="button" className="suggestion-card__open" onClick={onOpenDetail} title={title}>
        {poster ? <img src={poster} alt={title} className="suggestion-card__image" /> : <span className="suggestion-card__empty">{title}</span>}
      </button>

      <div className="suggestion-card__bar">
        <div className="suggestion-card__group">
          {isAvailable && (
            <span className="suggestion-card__icon suggestion-card__icon--static" data-tooltip={t("card.availableStreaming")} data-tooltip-align="start" aria-label={t("card.availableStreaming")}>
              <TvIcon />
            </span>
          )}
        </div>

        <div className="suggestion-card__group">
          <AddToTimelineButton uid={uid} movie={{ id, mediaType, title, posterPath }} variant="icon" />
          <button type="button" className="suggestion-card__icon" onClick={onPlayTrailer} data-tooltip={t("card.watchTrailer")} aria-label={t("card.watchTrailer")}>
            <PlayCircleIcon />
          </button>
          <button
            type="button"
            className={isChecked ? "suggestion-card__icon suggestion-card__icon--checked" : "suggestion-card__icon"}
            onClick={onToggleChecked}
            disabled={!uid}
            data-tooltip={checkLabel}
            data-tooltip-align="end"
            aria-label={checkLabel}
            aria-pressed={isChecked}
          >
            {isChecked ? <CheckCircleSolid /> : <CheckCircleIcon />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestionCard;
