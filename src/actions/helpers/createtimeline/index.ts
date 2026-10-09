import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createTimeline, type ContentType } from "@/actions/helpers/timelines";
import { resolveTimelineMovies, respondToTimelineChat, type ResolvedTimelineDraft } from "@/actions/helpers/timelineai";

interface TimelineTurn {
  message: string;
  reply: string | null;
  resultCount: number | null;
  error: string | null;
}

// Junta o pedido original e os ajustes seguintes numa descrição só, para a IA aplicar todos.
const combineMessages = (messages: string[]): string => {
  if (messages.length === 1) return messages[0];
  const adjustments = messages.slice(1).map((message, index) => `${index + 1}. ${message}`).join("\n");
  return `${messages[0]}\n\nAjustes adicionais pedidos pelo usuário depois do pedido original, nessa ordem (aplique todos, não só o último):\n${adjustments}`;
};

// Ciclo "criar timeline pela IA": a descrição vira uma lista -> o usuário ajusta conversando -> salvar (a timeline nasce seguida).
// usado no modal "criar timeline" (faixa "Criar uma nova timeline" de Filmes, Séries e Animes).
export const useTimelineChat = (uid: string, initialDescription: string, categoryLock: ContentType | undefined, onSaved: () => void) => {
  const { t } = useTranslation();
  const [turns, setTurns] = useState<TimelineTurn[]>([{ message: initialDescription, reply: null, resultCount: null, error: null }]);
  const [draft, setDraft] = useState<ResolvedTimelineDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateLastTurn = (patch: Partial<TimelineTurn>) =>
    setTurns((prev) => prev.map((turn, index) => (index === prev.length - 1 ? { ...turn, ...patch } : turn)));

  // A busca (IA + TMDb): guarda a lista que a pessoa vê e devolve quantos títulos vieram. Serve para a abertura e para os ajustes.
  const search = async (description: string): Promise<number> => {
    const result = await resolveTimelineMovies(description, categoryLock);
    setDraft(result);
    return result.movies.length;
  };

  // 1. primeira resolução, ao abrir
  useEffect(() => {
    search(initialDescription)
      .then((count) => updateLastTurn({ resultCount: count }))
      .catch((err) => {
        console.error("Erro ao processar timeline:", err);
        updateLastTurn({ error: err instanceof Error ? err.message : t("dashboard.createTimeline.processError") });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. ajuste pelo chat: a IA responde e, se for um pedido de mudança, a lista é refeita com todos os ajustes
  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setTurns([...turns, { message: text, reply: null, resultCount: null, error: null }]);
    setInput("");
    setLoading(true);
    try {
      const chat = await respondToTimelineChat(turns.map((turn) => turn.message), draft?.movies ?? [], text);
      const count = chat.isRefinement ? await search(combineMessages([...turns.map((turn) => turn.message), text])) : null;
      updateLastTurn({ reply: chat.reply, resultCount: count });
    } catch (err) {
      console.error("Erro na conversa da timeline:", err);
      updateLastTurn({ error: err instanceof Error ? err.message : t("dashboard.createTimeline.chatError") });
    } finally {
      setLoading(false);
    }
  };

  // 3. salvar
  const save = async () => {
    if (!draft || draft.movies.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createTimeline(uid, draft.name, draft.types, draft.movies, { followed: true });
      onSaved();
    } catch (err) {
      console.error("Erro ao salvar timeline:", err);
      setSaveError(t("dashboard.createTimeline.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return {
    turns, // a conversa: cada turno tem a mensagem da pessoa, a resposta da IA, quantos títulos vieram e o erro (se houve)
    draft, // a timeline pronta para salvar (nome, tipo e títulos); null enquanto a primeira busca não terminou
    loading, // true enquanto a IA está buscando a lista (na abertura ou num ajuste)
    input, // o texto que a pessoa está digitando no campo do chat de ajustes
    setInput, // atualiza o texto do campo a cada tecla
    saving, // true enquanto a timeline está sendo gravada no Firebase
    saveError, // a mensagem de erro se não foi possível salvar (senão null)
    send, // envia a mensagem do campo: a IA responde e, se for um pedido de mudança, a lista é refeita
    save, // grava a timeline no Firebase (já seguida) e avisa o modal que terminou
  };
};
