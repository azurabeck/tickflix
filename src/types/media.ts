import type { FollowedCategory } from "@/actions/helpers/followed";

export interface DashboardMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  voteAverage?: number;
  year?: string;
  available?: boolean;
}

export interface MajorReleaseMovie extends DashboardMovie {
  available: boolean;
  releaseDate: string;
}

export interface HeroTrailer {
  id: number;
  title: string;
  youtubeKey: string;
  isDubbed: boolean;
}

type MediaCardType = "movie" | "serie";

export interface MediaItem {
  id?: number;
  mediaType?: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  posterUrl?: string | null;
  year?: string;
  available?: boolean;
  href?: string;
  rankLabel?: string;
  category?: FollowedCategory;
}

export const cardTypeOf = (item: { mediaType?: "movie" | "tv" }): MediaCardType => (item.mediaType === "tv" ? "serie" : "movie");

export interface RankItem {
  key: string;
  id: number;
  mediaType: "movie" | "tv";
  type: MediaCardType;
  title: string;
  rating: number | null;
  checked: boolean;
  available: boolean;
  card: MediaItem; // os dados do card, para marcar como visto/avaliar sem consultar de novo
}
