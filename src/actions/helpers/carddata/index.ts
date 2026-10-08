import { fetchTitleById } from "@/service/TMDbSettings";
import { fetchAvailabilityMap } from "@/actions/helpers/moviedetail";

// Tudo que o card precisa para a capa: título, ano, imagens e se dá para assistir. Fica gravado no Firebase junto com o título
// do usuário (visto, avaliado ou seguido), então as sections do Firebase não consultam o TMDb para montar os cards.
export interface CardData {
  title: string;
  year?: string;
  posterPath: string | null;
  backdropPath?: string | null;
  available?: boolean;
  availableCheckedAt?: number; // quando "disponível" foi conferido pela última vez
  category?: "series" | "animes";
}

const RECHECK_UNAVAILABLE_MS = 7 * 24 * 60 * 60 * 1000;
const PER_LOAD = 40;

// O registro está incompleto (veio de antes de guardarmos tudo) ou ainda está "indisponível" faz mais de uma semana
// (pode ter entrado em algum streaming desde então).
const needsCardData = (entry: Partial<CardData> & { mediaType?: "movie" | "tv" }): boolean =>
  !entry.title ||
  (entry.mediaType === "tv" && entry.category === undefined) ||
  entry.year === undefined ||
  entry.backdropPath === undefined ||
  entry.available === undefined ||
  (entry.available === false && Date.now() - (entry.availableCheckedAt ?? 0) > RECHECK_UNAVAILABLE_MS);

// Consulta rápida no TMDb dos registros que precisam: completa os dados do card e confere de novo o "disponível".
// Cuida de no máximo 40 por abertura do site (do mais prioritário, na ordem recebida) para não pesar.
// Devolve os campos novos de cada um, para quem chamou gravar no Firebase.
// usado em: helpers/followed, helpers/watched
export const resolveCardData = async <T extends { key: string; id: number; mediaType: "movie" | "tv" } & Partial<CardData>>(
  entries: T[]
): Promise<Map<string, CardData>> => {
  const pending = entries.filter(needsCardData).slice(0, PER_LOAD);
  if (pending.length === 0) return new Map();

  const availability = await fetchAvailabilityMap(pending);
  const resolved = await Promise.all(
    pending.map(async (entry): Promise<[string, CardData]> => {
      const title = await fetchTitleById(entry.mediaType, entry.id);
      return [
        entry.key,
        {
          title: entry.title || title?.title || "",
          year: title?.year ?? entry.year ?? "",
          posterPath: entry.posterPath ?? title?.posterPath ?? null,
          backdropPath: title?.backdropPath ?? entry.backdropPath ?? null,
          available: availability.has(entry.key),
          availableCheckedAt: Date.now(),
          category: entry.category ?? title?.category,
        },
      ];
    })
  );
  return new Map(resolved);
};
