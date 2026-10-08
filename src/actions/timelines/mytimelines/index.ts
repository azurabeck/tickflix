import { useEffect, useState } from "react";
import { useConfirm } from "@/contexts/Confirm";
import { auth } from "@/service/FirebaseSettings";
import { deleteTimeline, fetchTimelines, setTimelineFollowed, type Timeline, type TimelineCategoryFilter } from "@/actions/helpers/timelines";

// Aba da página Timelines a partir do `?category=` da URL.
// usado em: página Timelines
export const parseCategory = (raw: string | null): TimelineCategoryFilter =>
  raw === "series" || raw === "animes" || raw === "franquias" || raw === "premiacoes" ? raw : "filmes";

// Quais timelines aparecem em cada aba da página.
// usado em: página Timelines
export const timelinesOfCategory = (timelines: Timeline[] | null, category: TimelineCategoryFilter): Timeline[] =>
  (timelines ?? []).filter((t) => {
    if (category === "franquias") return t.types.length > 1;
    if (category === "premiacoes") return Boolean(t.awardSlug);
    return t.types.length === 1 && t.types.includes(category) && !t.awardSlug;
  });

// Ciclo "minhas timelines": carregar, seguir/deixar de seguir (otimista) e apagar (com confirmação).
// usado em: página Timelines
export const useMyTimelines = () => {
  const uid = auth.currentUser?.uid ?? null;
  const confirm = useConfirm();
  const [timelines, setTimelines] = useState<Timeline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setTimelines([]);
      return;
    }
    fetchTimelines(uid)
      .then(setTimelines)
      .catch((err) => {
        console.error("Erro ao buscar timelines:", err);
        setError("Não foi possível carregar suas timelines agora.");
      });
  }, [uid]);

  const setFollowedLocal = (timelineId: string, followed: boolean | undefined) =>
    setTimelines((prev) => (prev ? prev.map((t) => (t.id === timelineId ? { ...t, followed } : t)) : prev));

  const toggleFollowed = async (timeline: Timeline) => {
    if (!uid) return;
    setFollowedLocal(timeline.id, !timeline.followed);
    try {
      await setTimelineFollowed(uid, timeline.id, !timeline.followed);
    } catch (err) {
      console.error("Erro ao seguir/deixar de seguir timeline:", err);
      setFollowedLocal(timeline.id, timeline.followed);
    }
  };

  const remove = async (timeline: Timeline) => {
    if (!uid || deletingId) return;
    const ok = await confirm({
      title: "Apagar timeline",
      message: `Apagar a timeline "${timeline.name}"? Essa ação não pode ser desfeita.`,
      confirmLabel: "Apagar",
      danger: true,
    });
    if (!ok) return;

    setDeletingId(timeline.id);
    setDeleteError(null);
    try {
      await deleteTimeline(uid, timeline.id);
      setTimelines((prev) => (prev ? prev.filter((t) => t.id !== timeline.id) : prev));
    } catch (err) {
      console.error("Erro ao apagar timeline:", err);
      setDeleteError("Não foi possível apagar a timeline agora.");
    } finally {
      setDeletingId(null);
    }
  };

  return { uid, timelines, error, deletingId, deleteError, toggleFollowed, remove };
};
