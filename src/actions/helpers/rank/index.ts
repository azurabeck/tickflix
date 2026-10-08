import { useMemo } from "react";
import { useMediaCards } from "@/contexts/MediaCards";
import { movieKey } from "@/actions/helpers/timelines";
import { cardTypeOf, type DashboardMovie, type MediaItem, type RankItem } from "@/types/media";

const RANK_MAX = 20;

// Chaves (`movie-1`, `tv-2`) mais bem avaliadas pelo usuário, só do tipo da página; empate fica com o mais recente.
// usado na section "Seu Rank de Notas" e na base de gosto da "Sugestão da IA".
export const topRatedKeys = (
  ratings: Map<string, number>,
  checkedMap: Map<string, number>,
  prefix: string,
  keyFilter?: (key: string) => boolean,
  limit: number = RANK_MAX
): string[] =>
  [...ratings.entries()]
    .filter(([key]) => key.startsWith(prefix) && (!keyFilter || keyFilter(key)))
    .sort(([keyA, a], [keyB, b]) => b - a || (checkedMap.get(keyB) ?? 0) - (checkedMap.get(keyA) ?? 0))
    .slice(0, limit)
    .map(([key]) => key);

interface RankOptions {
  mediaKind: "movie" | "tv";
  category?: "series" | "animes";
  keyFilter?: (key: string) => boolean;
  popularity: DashboardMovie[] | null; // vem do dashboard da página (backend)
}

// Section Rank: dois rankings lado a lado.
//   "Popularidade": a lista que veio do backend (dashboard da página), já com "disponível".
//   "Seu Rank de Notas": as notas que o usuário já deu (o MediaCardsProvider guarda título e imagens junto), da maior para a menor.
// usado em: RankSection
export const useRank = ({ mediaKind, category, keyFilter, popularity }: RankOptions) => {
  const media = useMediaCards();

  const toRankItem = (card: MediaItem & { id: number; mediaType: "movie" | "tv" }): RankItem => {
    const key = movieKey(card.mediaType, card.id);
    return {
      key,
      id: card.id,
      mediaType: card.mediaType,
      type: cardTypeOf(card),
      title: card.title,
      rating: media.ratings.get(key) ?? null,
      checked: media.isChecked(card),
      available: card.available ?? false,
      card,
    };
  };

  const popular = (popularity ?? []).slice(0, RANK_MAX);

  const ratedKeys = useMemo(
    () => topRatedKeys(media.ratings, media.checkedMap, `${mediaKind}-`, keyFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [media.ratings, media.checkedMap, mediaKind, keyFilter]
  );
  const yourItems = ratedKeys.flatMap((key): RankItem[] => {
    const stored = media.titles.get(key);
    const [mediaType, id] = key.split("-");
    return stored && (mediaType === "movie" || mediaType === "tv") ? [toRankItem({ ...stored, id: Number(id), mediaType })] : [];
  });

  const handlers = {
    disabled: !media.uid,
    onOpen: (item: RankItem) => media.openDetail({ id: item.id, mediaType: item.mediaType }),
    onToggleChecked: (item: RankItem) => media.toggleChecked({ ...item.card, category }),
    onRate: (item: RankItem, rating: number | null) => media.rate(item.card, rating),
  };

  return { popularityItems: popular.map(toRankItem), yourItems, handlers };
};
