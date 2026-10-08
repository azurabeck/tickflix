import { useMemo } from "react";
import { useMediaCards } from "@/contexts/MediaCards";
import type { MediaItem } from "@/types/media";

// Section "Meus animes" (Firebase): inicia o loading -> a lista vem do Firestore (MediaCardsProvider) -> fecha o loading.
// Cada título seguido já guarda o que o card precisa (imagens, ano, "disponível"), então não consulta o TMDb.
// usado em: presentation/cyclefollowing, página Animes
export const useMyAnimes = () => {
  const { followedList, followedLoading } = useMediaCards();

  const followed = useMemo(() => followedList.filter((s) => s.category === "animes"), [followedList]);
  const items = useMemo<MediaItem[]>(
    () => followed.map((s) => ({ id: s.id, mediaType: "tv", title: s.title, posterPath: s.posterPath, backdropPath: s.backdropPath, year: s.year, available: s.available, category: s.category })),
    [followed]
  );
  return { items, loading: followedLoading };
};
