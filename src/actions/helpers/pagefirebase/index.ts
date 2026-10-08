import { useEffect, useState } from "react";
import { useMediaCards } from "@/contexts/MediaCards";
import { useMyNotes } from "@/actions/helpers/rank";
import { fetchTimelines, type ContentType, type Timeline } from "@/actions/helpers/timelines";

// O que o dashboard lê do Firebase para a página.
// usado em: usePageDashboard
export interface FirebaseOptions {
  timelineType: ContentType; // tipo das "Timelines que você segue"
  mediaKind: "movie" | "tv"; // tipo dos títulos do "Seu Rank de Notas"
  category?: "series" | "animes"; // séries e animes são ambos `tv`: a categoria separa
}

// Timelines que o usuário segue e que são do tipo da página.
const useFollowedTimelines = (uid: string | null, type: ContentType) => {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(uid !== null);

  useEffect(() => {
    if (!uid) return;
    fetchTimelines(uid)
      .then((all) => setTimelines(all.filter((t) => t.followed && t.types.includes(type))))
      .catch((err) => console.error("Erro ao buscar timelines seguidas:", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return { items: timelines, loading };
};

// Dashboard, parte Firebase: lê o que é da página (timelines seguidas) e junta o que o MediaCardsProvider já leu no login
// (vistos, notas e seguidos). Cada section pega a sua fatia.
// usado em: helpers/section, presentation/cyclenotes, presentation/cyclerender
export const usePageFirebase = (uid: string | null, options: FirebaseOptions) => {
  const media = useMediaCards();
  const followedTimelines = useFollowedTimelines(uid, options.timelineType); // section "Timelines que você segue"
  const myNotes = useMyNotes(options.mediaKind, options.category); // section "Seu Rank de Notas"

  return {
    followedTimelines,
    myNotes,
    watchedLoading: media.watchedLoading, // section "Últimos vistos"
    followedLoading: media.followedLoading, // section "Minhas séries"
  };
};
