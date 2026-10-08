import { useMemo } from "react";
import { useMediaCards } from "@/contexts/MediaCards";
import { movieKey } from "@/actions/helpers/timelines";

// Section "Seu Rank de Notas" (Firebase): as notas já vêm do Firestore (MediaCardsProvider). Só entra o que é anime:
// cada título guarda a sua categoria (a do card quando foi avaliado ou seguido; os registros antigos são completados sozinhos no TMDb).
// Devolve também o que o usuário segue nesta página, que é a base de gosto da "Sugestão da IA" quando ainda não há notas.
// usado em: página Animes
export const useAnimesMyNotesRank = () => {
  const { followedList, titles } = useMediaCards();

  const keyFilter = useMemo(() => (key: string) => titles.get(key)?.category === "animes", [titles]);
  const recentKeys = useMemo(() => followedList.filter((s) => s.category === "animes").map((s) => movieKey("tv", s.id)), [followedList]);

  return { keyFilter, recentKeys };
};
