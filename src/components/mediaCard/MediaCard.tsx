// src/components/mediaCard/MediaCard.tsx
// COMPONENTE GLOBAL de card de filme / série / anime (Figma da Rebecca,
// "componente global de card de filme 2 types"). Todo lugar do app que
// mostra um título como card usa este — normalmente pelo
// `ConnectedMediaCard` (que já liga o card ao estado global), esta peça só
// desenha.
//
// FECHADO é só a imagem (cena do TMDb, paisagem); ABERTO ("em exibição" —
// só um por vez em cada fileira, ver useOpenCard.ts) ganha a área roxa
// embaixo, com dois TIPOS:
//
//   type "movie" (filmes)
//     Título
//     [Sua nota: 8,5]                  [📺 streaming] [▷ trailer] [✓ assistido]
//
//   type "serie" (séries e animes) — a linha vira 3 colunas
//     Título
//     [▬▬▬ barra    ]  [Sua nota: 8,5]  [▷ trailer] [✓ assistindo]
//      10 / 300
//
// Diferenças de comportamento entre os tipos:
//   - movie: o check é "assisti" e a nota só vale depois dele; tem o ícone
//     de "disponível em streaming".
//   - serie: o check é "estou assistindo" (segue a série → ela entra em
//     "Minhas séries"/"Meus animes"); concluída é a que completou a barra
//     de progresso; a nota vale a qualquer momento; sem ícone de streaming.
//
// Clicar na imagem de um card fechado abre ele (e fecha o que estava
// aberto); clicar na imagem do card JÁ aberto abre os detalhes (ou o
// ingresso.com, em "Em cartaz" — decisão de quem usa, `onOpenDetail`).
// Todos os ícones têm tooltip (`data-tooltip`, estilizado em styles.scss).
import type { ReactNode } from "react";
import { CheckCircleIcon, PlayCircleIcon, TvIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { useTranslation } from "react-i18next";
import { backdropCardUrl, posterUrl as resolveTmdbPosterUrl } from "@/service/TMDbSettings";
import RatingInput from "@/components/ratingInput";
import type { MediaCardType, MediaItem } from "./types";
import "./styles.scss";

export interface MediaCardProps {
  type: MediaCardType;
  item: MediaItem;
  uid: string | null;
  isOpen: boolean;
  // movie: já assisti · serie: estou assistindo (sigo a série).
  isChecked: boolean;
  // Só movie: disponível em streaming/aluguel.
  isAvailable?: boolean;
  rating: number | null;
  // Só serie seguida: episódios vistos / total (a barra).
  progress?: { watched: number; total: number };
  // Card fechado: abre este card.
  onSelect: () => void;
  // Card aberto: clique na imagem (detalhes / ingresso).
  onOpenDetail: () => void;
  onToggleChecked: () => void;
  onRate: (rating: number | null) => void;
  onPlayTrailer: () => void;
  // Enfeite opcional no canto da imagem (ex.: "Vencedor" no Oscar).
  badge?: ReactNode;
  // Linha pequena sob o título (ex.: nome do indicado no Oscar).
  subtitle?: string;
  // Card dentro de um MODAL: todos no tamanho GRANDE (300x225) com a área
  // roxa SEMPRE visível, sem precisar clicar pra abrir — não há "um aberto
  // por vez"; clicar na imagem já abre o detalhe. Padrão false (fileiras:
  // fechado 220x170, aberto 300x225).
  isModal?: boolean;
}

const MediaCard = ({
  type,
  item,
  uid,
  isOpen,
  isChecked,
  isAvailable = false,
  rating,
  progress,
  onSelect,
  onOpenDetail,
  onToggleChecked,
  onRate,
  onPlayTrailer,
  badge,
  subtitle,
  isModal = false,
}: MediaCardProps) => {
  const { t } = useTranslation();
  const isSerie = type === "serie";
  const showPanel = isOpen || isModal;
  const backdrop = backdropCardUrl(item.backdropPath);
  const poster = item.posterUrl ?? resolveTmdbPosterUrl(item.posterPath ?? null);
  const image = backdrop ?? poster;
  const hasIdentity = item.id !== undefined && item.mediaType !== undefined;

  const checkLabel = t(isSerie ? (isChecked ? "card.unmarkFollowing" : "card.markFollowing") : isChecked ? "card.unmarkWatched" : "card.markWatched");
  const progressPct = progress && progress.total > 0 ? Math.round((progress.watched / progress.total) * 100) : 0;
  const progressLabel = progress ? t("card.progress", { watched: progress.watched, total: progress.total }) : "";

  return (
    <div className={["media-card", isOpen && "media-card--open", isModal && "media-card--modal"].filter(Boolean).join(" ")}>
      <button type="button" className="media-card__media" onClick={showPanel ? onOpenDetail : onSelect} title={item.title} aria-expanded={isOpen}>
        {image ? (
          <img src={image} alt={item.title} className={backdrop ? "media-card__image" : "media-card__image media-card__image--poster-fallback"} loading="lazy" />
        ) : (
          <div className="media-card__image media-card__image--empty" />
        )}
      </button>

      {badge && <span className="media-card__badge">{badge}</span>}

      {showPanel && (
        <div className="media-card__panel">
          <h3 className="media-card__name">{item.title}</h3>
          {subtitle && <p className="media-card__subtitle">{subtitle}</p>}

          <div className={isSerie ? "media-card__row media-card__row--serie" : "media-card__row"}>
            {isSerie && (
              <div className="media-card__progress" data-tooltip={progress ? progressLabel : undefined} data-tooltip-align="start" aria-label={progress ? progressLabel : undefined}>
                {progress && (
                  <>
                    <div className="media-card__progress-bar">
                      <div className="media-card__progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="media-card__progress-text">
                      {progress.watched} / {progress.total}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="media-card__group">
              {hasIdentity && <RatingInput rating={rating} onChange={onRate} disabled={!uid || !(isSerie || isChecked)} />}
              {!hasIdentity && item.rankLabel && <span className="media-card__label">{item.rankLabel}</span>}
            </div>

            {hasIdentity && (
              <div className="media-card__group media-card__group--actions">
                {!isSerie && isAvailable && (
                  <span className="media-card__icon media-card__icon--static" data-tooltip={t("card.availableStreaming")} aria-label={t("card.availableStreaming")}>
                    <TvIcon />
                  </span>
                )}
                <button type="button" className="media-card__icon" onClick={onPlayTrailer} data-tooltip={t("card.watchTrailer")} aria-label={t("card.watchTrailer")}>
                  <PlayCircleIcon />
                </button>
                <button
                  type="button"
                  className={isChecked ? "media-card__icon media-card__icon--checked" : "media-card__icon"}
                  onClick={onToggleChecked}
                  disabled={!uid}
                  data-tooltip={checkLabel}
                  data-tooltip-side={isModal ? undefined : "right"}
                  data-tooltip-align={isModal ? "end" : undefined}
                  aria-label={checkLabel}
                  aria-pressed={isChecked}
                >
                  {isChecked ? <CheckCircleSolid /> : <CheckCircleIcon />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaCard;
