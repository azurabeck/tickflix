import { useMemo } from "react";
import { useMediaCards } from "@/contexts/MediaCards";
import { movieKey } from "@/actions/helpers/timelines";
import { cardTypeOf, type MediaItem, type RankItem } from "@/types/media";

const RANK_MAX = 20;

// O rank "Seu Rank de Notas" de uma página, pronto para mostrar: os itens e o carregando.
// usado em: RankSection, movies/mynotesrank, series/mynotesrank, animes/mynotesrank
export interface MyNotes {
  items: RankItem[];
  loading: boolean;
}

// Chaves (`movie-1`, `tv-2`) mais bem avaliadas pelo usuário, só do tipo da página; empate fica com o mais recente.
// usado em: useMyNotes, presentation/cyclenotes
const topRatedKeys = (
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

// Devolve a função que transforma um card em item de rank, com a nota do usuário e se ele já viu/segue.
// usado em: animes/mostwatchedrank, movies/popularityrank, presentation/cyclenotes, series/mostwatchedrank
export const useToRankItem = () => {
  const media = useMediaCards();
  return (card: MediaItem & { id: number; mediaType: "movie" | "tv" }): RankItem => {
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
};

// Section "Popularidade" / "Mais vistas" (Rank): a fatia do dashboard (backend) vira itens de rank, com a nota do usuário em cada card.
// usado em: animes/mostwatchedrank, movies/popularityrank, series/mostwatchedrank
export const toPopularityItems = (cards: (MediaItem & { id: number; mediaType: "movie" | "tv" })[] | null, toRankItem: ReturnType<typeof useToRankItem>): RankItem[] | null =>
  cards ? cards.slice(0, RANK_MAX).map(toRankItem) : null;

// Section "Seu Rank de Notas" (Firebase): as notas que o usuário já deu (o MediaCardsProvider guarda título e imagens junto), da maior
// para a menor. Só entra o que é do tipo da página; em séries e animes, a categoria que o título guarda.
// usado em: helpers/pagefirebase, presentation/cyclenotes
export const useMyNotes = (mediaKind: "movie" | "tv", category?: "series" | "animes"): MyNotes => {
  const { ratings, checkedMap, titles, watchedLoading } = useMediaCards();
  const toRankItem = useToRankItem();

  const keyFilter = useMemo(() => (category ? (key: string) => titles.get(key)?.category === category : undefined), [titles, category]);

  const items = useMemo(
    () =>
      topRatedKeys(ratings, checkedMap, `${mediaKind}-`, keyFilter).flatMap((key): RankItem[] => {
        const stored = titles.get(key);
        const [type, id] = key.split("-");
        return stored && (type === "movie" || type === "tv") ? [toRankItem({ ...stored, id: Number(id), mediaType: type })] : [];
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ratings, checkedMap, titles, mediaKind, keyFilter]
  );

  return { items, loading: watchedLoading };
};

// As ações dos cards dos ranks (abrir, marcar como visto, avaliar): as mesmas nos dois blocos.
// usado em: presentation/cyclenotes, RankSection
export const useRankHandlers = (category?: "series" | "animes") => {
  const media = useMediaCards();
  return {
    disabled: !media.uid,
    onOpen: (item: RankItem) => media.openDetail({ id: item.id, mediaType: item.mediaType }),
    onToggleChecked: (item: RankItem) => media.toggleChecked({ ...item.card, category }),
    onRate: (item: RankItem, rating: number | null) => media.rate(item.card, rating),
  };
};
