import { useMemo } from "react";
import { useMediaCards } from "@/contexts/MediaCards";
import type { DashboardMovie } from "@/types/media";

// Quantos filmes aparecem na fileira Últimos vistos.
// usado em: página Filmes
export const RAIL_LIMIT = 8;
// Quantos filmes aparecem no modal "ver todos".
// usado em: RecentlyWatchedModal
export const MODAL_LIMIT = 60;

// Últimos vistos (section do Firebase): inicia o loading -> a lista do usuário vem do Firestore (MediaCardsProvider) -> fecha o loading.
// Os filmes que o usuário marcou, do mais recente para o mais antigo.
// A lista (com título, imagens e "disponível" de cada filme) já veio do Firestore pelo MediaCardsProvider: aqui só ordena e corta.
// usado na section "Últimos vistos", no modal "ver todos" e como base de gosto da "Sugestão da IA".
export const useRecentlyWatched = (limit: number) => {
  const { watchedMap, titles, watchedLoading } = useMediaCards();

  return useMemo(() => {
    const keys = [...watchedMap.entries()].sort(([, a], [, b]) => b - a).map(([key]) => key);
    const items = keys.flatMap((key): DashboardMovie[] => {
      const stored = titles.get(key);
      return stored ? [{ ...stored, id: Number(key.slice("movie-".length)), mediaType: "movie" }] : [];
    });
    return { keys: keys.slice(0, limit), items: items.slice(0, limit), loading: watchedLoading };
  }, [watchedMap, titles, watchedLoading, limit]);
};
