import { useState } from "react";
import type { MediaItem } from "@/types/media";

// Chave de um card na fileira (`tipo-id`, ou título e posição quando não tem id).
// usado em: EditionDetail, MajorReleasesModal, MediaRailSection, PosterGridModal, SearchModal, TimelineDetail, …
export const cardKey = (item: MediaItem, index: number): string =>
  item.id !== undefined && item.mediaType !== undefined ? `${item.mediaType}-${item.id}` : `${item.title}-${index}`;

// Um card aberto por vez em cada fileira. Se o card escolhido sair da lista,
// o primeiro volta a ficar aberto.
// usado em: EditionDetail, MajorReleasesModal, MediaRailSection, PosterGridModal, SearchModal, TimelineDetail, …
export const useOpenCard = (items: MediaItem[]) => {
  const [chosen, setChosen] = useState<string | null>(null);
  const keys = items.map(cardKey);
  const openKey = chosen !== null && keys.includes(chosen) ? chosen : keys[0] ?? null;
  return { openKey, setOpenKey: setChosen };
};
