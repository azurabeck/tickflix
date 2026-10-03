// src/components/mediaCard/types.ts
// Item que o card global de filme/série/anime sabe desenhar.
//
// `id`/`mediaType` são OPCIONAIS — "Em cartaz" vem do catálogo do
// ingresso.com (ver service/IngressoSettings.ts), que nem sempre tem match
// no TMDb; sem id/mediaType não dá pra calcular uma chave de "já vi"
// estável, então os botões de ação (check, nota, trailer) somem pra esses
// itens. `posterUrl` (URL completa, ex.: CDN do ingresso.com) tem
// prioridade sobre `posterPath` (fragmento do TMDb) quando os dois vierem.
import type { FollowedCategory } from "@/service/FollowingSettings";

// Os dois TIPOS do card (Figma da Rebecca, "componente global de card de
// filme"): `movie` serve filmes; `serie` serve séries E animes.
export type MediaCardType = "movie" | "serie";

export interface MediaItem {
  id?: number;
  mediaType?: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  // Imagem de cena (paisagem) do TMDb — preferida; sem ela cai pro pôster
  // cortado (e o card aberto tenta resolver a cena sozinho, ver
  // ConnectedMediaCard).
  backdropPath?: string | null;
  posterUrl?: string | null;
  href?: string; // link pronto pro clique (ex.: página real do filme no ingresso.com)
  rankLabel?: string;
  // Só série/anime: em qual lista seguir (página Séries = "series", página
  // Animes = "animes"). Padrão "series".
  category?: FollowedCategory;
}

export const cardTypeOf = (item: { mediaType?: "movie" | "tv" }): MediaCardType => (item.mediaType === "tv" ? "serie" : "movie");
