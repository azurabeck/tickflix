// src/components/mediaCard/useOpenCard.ts
// Qual card de uma fileira está ABERTO ("em exibição", ver RailCard.tsx) —
// sempre exatamente um: o último que o usuário clicou; enquanto ele não
// clicou em nenhum (ou o que clicou saiu da lista, ex.: troca de mês), o
// primeiro da fileira. O card aberto fica onde está (não muda de posição).
import { useState } from "react";
import type { MediaItem } from "./types";

export const cardKey = (item: MediaItem, index: number): string =>
  item.id !== undefined && item.mediaType !== undefined ? `${item.mediaType}-${item.id}` : `${item.title}-${index}`;

export const useOpenCard = (items: MediaItem[]) => {
  const [chosen, setChosen] = useState<string | null>(null);
  const keys = items.map(cardKey);
  const openKey = chosen !== null && keys.includes(chosen) ? chosen : keys[0] ?? null;
  return { openKey, setOpenKey: setChosen };
};
