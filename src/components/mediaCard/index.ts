// src/components/mediaCard/index.ts
// Card global de filme/série/anime — ver MediaCard.tsx. Páginas usam
// `ConnectedMediaCard` (+ `useOpenCard` pra "um aberto por vez"); o estado
// compartilhado vem do `MediaCardsProvider` montado em PrivateLayout.
export { default as MediaCard } from "./MediaCard";
export { default as ConnectedMediaCard } from "./ConnectedMediaCard";
export { default as MediaCardsProvider, useMediaCards, type MediaCardsApi, type MediaRef } from "./MediaCardsProvider";
export { cardKey, useOpenCard } from "./useOpenCard";
export { cardTypeOf, type MediaCardType, type MediaItem } from "./types";
