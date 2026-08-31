// src/pages/private/home/dashboard/CreateTimelineModal.tsx
// Abre ao clicar "criar timeline": mostra a lista que a IA foi buscar
// ANTES de gravar em qualquer lugar, com um campo pra "conversar" e
// ajustar o pedido até o resultado ficar certo — só grava no Firestore
// quando o usuário confirma (garante que a IA entendeu o pedido antes
// de salvar qualquer coisa).
//
// Cada mensagem do usuário passa primeiro por respondToTimelineChat
// (functions.ts), que decide se é só uma pergunta/comentário — responde
// em texto, sem mexer na lista — ou um pedido de ajuste concreto —
// responde E reprocessa a busca. Sem essa distinção, perguntar "qual a
// referência você tá usando" simplesmente refazia a mesma busca sem
// responder nada (bug relatado pela Rebecca: "ele não está conversando
// comigo, só está gerando a mesma lista novamente"). O reprocessamento
// em si NÃO edita a lista anterior "na mão" — reprocessa o pedido
// inteiro (descrição original + todos os ajustes confirmados, em ordem)
// pelo mesmo pipeline determinístico de sempre (resolveTimelineMovies),
// então cada ajuste herda as mesmas garantias de qualquer busca nova.
import { useEffect, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { createTimeline, type ContentType, type TimelineMovie } from "@/service/TimelineSettings";
import { posterUrl } from "@/service/TMDbSettings";
import { resolveTimelineMovies, respondToTimelineChat, type ResolvedTimelineDraft } from "./functions";

interface CreateTimelineModalProps {
  uid: string;
  initialDescription: string;
  onClose: () => void;
  onSaved: () => void;
  // Painel da página Séries passa "series", o da página Animes passa
  // "animes" — resultado restrito ao tipo (e, pra anime, ao
  // gênero/país), timeline criada já sai com essa categoria
  // (resolveTimelineMovies decide sozinho a partir disso, ver
  // functions.ts). Omitido/undefined = comportamento de sempre (painel
  // da Home, categoria "filmes").
  categoryLock?: ContentType;
}

interface Turn {
  message: string;
  reply: string | null; // null na 1ª mensagem (é a busca inicial, não uma resposta de chat)
  resultCount: number | null; // preenchido só quando essa mensagem causou (re)busca
  error: string | null;
}

const buildCombinedDescription = (messages: string[]): string => {
  if (messages.length === 1) return messages[0];
  const adjustments = messages
    .slice(1)
    .map((message, index) => `${index + 1}. ${message}`)
    .join("\n");
  return `${messages[0]}\n\nAjustes adicionais pedidos pelo usuário depois do pedido original, nessa ordem (aplique todos, não só o último):\n${adjustments}`;
};

const CreateTimelineModal = ({ uid, initialDescription, onClose, onSaved, categoryLock }: CreateTimelineModalProps) => {
  const [turns, setTurns] = useState<Turn[]>([
    { message: initialDescription, reply: null, resultCount: null, error: null },
  ]);
  const [draft, setDraft] = useState<ResolvedTimelineDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [refinementInput, setRefinementInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateLastTurn = (patch: Partial<Turn>) => {
    setTurns((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...patch };
      return next;
    });
  };

  // 1ª mensagem sempre dispara uma busca de verdade — é o pedido em si,
  // não uma pergunta sobre um resultado que ainda não existe.
  useEffect(() => {
    setLoading(true);
    resolveTimelineMovies(initialDescription, categoryLock)
      .then((result) => {
        setDraft(result);
        updateLastTurn({ resultCount: result.movies.length, error: null });
      })
      .catch((err) => {
        console.error("Erro ao processar timeline:", err);
        // Mostra o motivo real (erro do Gemini, do TMDb etc.) em vez de
        // uma mensagem genérica — sem isso não dava pra saber o que
        // quebrou sem abrir o console do navegador (mesmo ajuste já
        // feito no botão "Resolver com IA" da página Oscar).
        updateLastTurn({ error: err instanceof Error ? err.message : "Não consegui processar esse pedido. Tenta ajustar a descrição." });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendRefinement = async () => {
    const text = refinementInput.trim();
    if (!text || loading) return;

    const priorAdjustments = turns.slice(1).map((turn) => turn.message);
    const currentTitles = (draft?.movies ?? []).map((movie) => movie.title);

    const nextTurns: Turn[] = [...turns, { message: text, reply: null, resultCount: null, error: null }];
    setTurns(nextTurns);
    setRefinementInput("");
    setLoading(true);

    try {
      const chat = await respondToTimelineChat(initialDescription, priorAdjustments, currentTitles, text);

      let resultCount: number | null = null;
      if (chat.isRefinement) {
        const allMessages = nextTurns.map((turn) => turn.message);
        const result = await resolveTimelineMovies(buildCombinedDescription(allMessages), categoryLock);
        setDraft(result);
        resultCount = result.movies.length;
      }

      updateLastTurn({ reply: chat.reply, resultCount, error: null });
    } catch (err) {
      console.error("Erro na conversa da timeline:", err);
      updateLastTurn({ error: err instanceof Error ? err.message : "Não consegui processar essa mensagem. Tenta de novo." });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft || draft.movies.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      // followed=true: timeline nova já entra seguida, aparece direto na
      // Home ("Timelines que você segue") sem precisar ir marcar a
      // estrela na página Timelines — pedido explícito da Rebecca.
      await createTimeline(uid, draft.name, draft.types, draft.movies, { followed: true });
      onSaved();
    } catch (err) {
      console.error("Erro ao salvar timeline:", err);
      setSaveError("Não foi possível salvar a timeline agora.");
    } finally {
      setSaving(false);
    }
  };

  const movies: TimelineMovie[] = draft?.movies ?? [];

  return (
    <div className="dashboard__create-modal-overlay" onClick={onClose}>
      <div className="dashboard__create-modal-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dashboard__create-modal-close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <h2 className="dashboard__create-modal-title">{draft?.name ?? "Montando sua timeline..."}</h2>

        <div className="dashboard__create-modal-conversation">
          {turns.map((turn, index) => {
            const isLast = index === turns.length - 1;
            return (
              <div key={index} className="dashboard__create-modal-turn">
                <p className="dashboard__create-modal-user-message">{turn.message}</p>

                {turn.error && <p className="dashboard__create-modal-turn-error">{turn.error}</p>}

                {!turn.error && turn.reply && <p className="dashboard__create-modal-ai-reply">{turn.reply}</p>}

                {!turn.error && turn.resultCount !== null && (
                  <p className="dashboard__create-modal-turn-result">
                    encontrei {turn.resultCount} título{turn.resultCount === 1 ? "" : "s"}
                  </p>
                )}

                {!turn.error && !turn.reply && turn.resultCount === null && isLast && loading && (
                  <p className="dashboard__create-modal-turn-result">
                    <Loader2 className="dashboard__spinner" size={14} /> {index === 0 ? "buscando..." : "pensando..."}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="dashboard__create-modal-preview">
          {!loading && movies.length === 0 && (
            <p className="dashboard__create-modal-empty">Nenhum título encontrado ainda — ajuste o pedido abaixo.</p>
          )}
          {movies.length > 0 && (
            <div className="dashboard__create-modal-poster-grid">
              {movies.map((movie) => {
                const poster = posterUrl(movie.posterPath);
                return (
                  <div key={`${movie.mediaType}-${movie.id}`} className="dashboard__create-modal-poster-item">
                    {poster ? (
                      <img src={poster} alt={movie.title} />
                    ) : (
                      <div className="dashboard__create-modal-poster-item--empty" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dashboard__create-modal-refine">
          <input
            type="text"
            className="dashboard__create-modal-refine-input"
            placeholder="Pergunte ou ajuste: ex. &quot;qual referência você usou?&quot;, &quot;tira os mais fracos&quot;..."
            value={refinementInput}
            disabled={loading}
            onChange={(e) => setRefinementInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendRefinement()}
          />
          <button
            type="button"
            className="dashboard__create-modal-refine-button"
            onClick={handleSendRefinement}
            disabled={loading || !refinementInput.trim()}
            aria-label="Enviar mensagem"
          >
            <Send size={16} />
          </button>
        </div>

        {saveError && <p className="dashboard__create-modal-turn-error">{saveError}</p>}

        <button
          type="button"
          className="dashboard__create-modal-save"
          onClick={handleSave}
          disabled={loading || saving || movies.length === 0}
        >
          {saving ? <Loader2 className="dashboard__spinner" size={18} /> : `Salvar timeline (${movies.length})`}
        </button>
      </div>
    </div>
  );
};

export default CreateTimelineModal;
