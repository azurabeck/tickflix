// src/components/mediaCard/ConnectedMediaCard.tsx
// O card global já ligado ao estado do app (MediaCardsProvider): descobre
// sozinho o TIPO (filme → `movie`; série/anime → `serie`), se está
// marcado, a nota, o progresso de episódios e a disponibilidade, e liga
// check/nota/trailer/detalhe às ações globais. É este que as páginas usam;
// o `MediaCard` puro só desenha.
import { useEffect, useState, type ReactNode } from "react";
import { followedSeriesProgress } from "@/service/FollowingSettings";
import { movieKey } from "@/service/TimelineSettings";
import { fetchTitleById } from "@/service/TMDbSettings";
import MediaCard from "./MediaCard";
import { useMediaCards } from "./MediaCardsProvider";
import { cardTypeOf, type MediaItem } from "./types";

interface ConnectedMediaCardProps {
  item: MediaItem;
  isOpen: boolean;
  onSelect: () => void;
  // Clique na imagem do card JÁ aberto — padrão abre o detalhe; "Em cartaz"
  // sobrescreve pra ir direto pro ingresso.com.
  onOpen?: (item: MediaItem) => void;
  // Disponibilidade já resolvida por quem lista (ex.: lançamentos) — vence
  // a do mapa global.
  available?: boolean;
  badge?: ReactNode;
  subtitle?: string;
  // Dentro de um modal: imagem sempre no tamanho máximo (ver MediaCard).
  isModal?: boolean;
}

const ConnectedMediaCard = ({ item, isOpen, onSelect, onOpen, available, badge, subtitle, isModal }: ConnectedMediaCardProps) => {
  const media = useMediaCards();
  const type = cardTypeOf(item);
  const hasIdentity = item.id !== undefined && item.mediaType !== undefined;
  const key = hasIdentity ? movieKey(item.mediaType!, item.id!) : null;
  const followed = type === "serie" && item.id !== undefined ? media.followed.get(item.id) : undefined;

  // Quem lista só tem o pôster (ex.: timelines, franquias, busca,
  // indicados): o card busca a cena (backdrop) no TMDb pra ter a mesma
  // imagem paisagem dos outros — memoizado (fetchTitleById) e limitado pelo
  // rate limiter do TMDb. Listas da Home/Séries já trazem o backdrop e
  // nunca caem aqui.
  const [resolvedBackdrop, setResolvedBackdrop] = useState<string | null>(null);
  useEffect(() => {
    if (item.backdropPath || item.posterUrl || !hasIdentity) return;
    let cancelled = false;
    fetchTitleById(item.mediaType!, item.id!).then((title) => {
      if (!cancelled && title?.backdropPath) setResolvedBackdrop(title.backdropPath);
    });
    return () => {
      cancelled = true;
    };
  }, [item.id, item.mediaType, item.backdropPath, item.posterUrl, hasIdentity]);

  const openDetail = () => {
    if (onOpen) onOpen(item);
    else if (hasIdentity) media.openDetail({ id: item.id!, mediaType: item.mediaType! });
  };

  return (
    <MediaCard
      type={type}
      item={resolvedBackdrop && !item.backdropPath ? { ...item, backdropPath: resolvedBackdrop } : item}
      uid={media.uid}
      isOpen={isOpen}
      isChecked={media.isChecked(item)}
      isAvailable={available ?? Boolean(key && media.availabilityMap.has(key))}
      rating={key ? media.ratings.get(key) ?? null : null}
      progress={followed ? followedSeriesProgress(followed) : undefined}
      onSelect={onSelect}
      onOpenDetail={openDetail}
      onToggleChecked={() => media.toggleChecked(item)}
      onRate={(rating) => key && media.rate(key, rating)}
      onPlayTrailer={() => hasIdentity && media.playTrailer({ id: item.id!, mediaType: item.mediaType!, title: item.title })}
      badge={badge}
      subtitle={subtitle}
      isModal={isModal}
    />
  );
};

export default ConnectedMediaCard;
