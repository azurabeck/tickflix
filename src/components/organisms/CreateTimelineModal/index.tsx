import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import Modal from "@/components/atoms/Modal";
import Spinner from "@/components/atoms/Spinner";
import { useTimelineChat } from "@/actions/helpers/createtimeline";
import type { ContentType, TimelineMovie } from "@/actions/helpers/timelines";
import { posterUrl } from "@/service/TMDbSettings";
import "./style.scss";

interface CreateTimelineModalProps {
  uid: string;
  initialDescription: string;
  onClose: () => void;
  onSaved: () => void;
  categoryLock?: ContentType;
}

const CreateTimelineModal = ({ uid, initialDescription, onClose, onSaved, categoryLock }: CreateTimelineModalProps) => {
  const { t } = useTranslation();
  const { 
    turns,      // a conversa: cada turno tem a mensagem da pessoa, a resposta da IA, quantos títulos vieram e o erro (se houve)
    draft,      // a timeline pronta para salvar (nome, tipo e títulos); null enquanto a primeira busca não terminou
    loading,    // true enquanto a IA está buscando a lista (na abertura ou num ajuste)
    input,      // o texto que a pessoa está digitando no campo do chat de ajustes
    setInput,   // atualiza o texto do campo a cada tecla
    saving,     // true enquanto a timeline está sendo gravada no Firebase
    saveError,  // a mensagem de erro se não foi possível salvar (senão null)
    send,       // envia a mensagem do campo: a IA responde e, se for um pedido de mudança, a lista é refeita
    save        // grava a timeline no Firebase (já seguida) e avisa o modal que terminou
   } = useTimelineChat(uid, initialDescription, categoryLock, onSaved);

  const movies: TimelineMovie[] = draft?.movies ?? [];

  return (
    <Modal onClose={onClose} size="md" scroll="content" title={draft?.name ?? t("dashboard.createTimeline.modalTitle")}>
      <div className="create-timeline-modal__conversation">
        {turns.map((turn, index) => {
          const isLast = index === turns.length - 1;
          return (
            <div key={index} className="create-timeline-modal__turn">
              <p className="create-timeline-modal__user-message">{turn.message}</p>

              {turn.error && <p className="create-timeline-modal__turn-error">{turn.error}</p>}
              {!turn.error && turn.reply && <p className="create-timeline-modal__ai-reply">{turn.reply}</p>}
              {!turn.error && turn.resultCount !== null && <p className="create-timeline-modal__turn-result">{t("dashboard.createTimeline.resultCount", { count: turn.resultCount })}</p>}

              {!turn.error && !turn.reply && turn.resultCount === null && isLast && loading && (
                <p className="create-timeline-modal__turn-result">
                  <Spinner size={14} /> {index === 0 ? t("dashboard.createTimeline.searching") : t("dashboard.createTimeline.thinking")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="create-timeline-modal__preview">
        {!loading && movies.length === 0 && <p className="create-timeline-modal__empty">{t("dashboard.createTimeline.emptyResults")}</p>}
        {movies.length > 0 && (
          <div className="create-timeline-modal__poster-grid">
            {movies.map((movie) => {
              const poster = posterUrl(movie.posterPath);
              return (
                <div key={`${movie.mediaType}-${movie.id}`} className="create-timeline-modal__poster-item">
                  {poster ? <img src={poster} alt={movie.title} /> : <div className="create-timeline-modal__poster-item--empty" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="create-timeline-modal__refine">
        <input
          type="text"
          className="create-timeline-modal__refine-input"
          placeholder={t("dashboard.createTimeline.refinePlaceholder")}
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          type="button"
          className="create-timeline-modal__refine-button"
          onClick={send}
          disabled={loading || !input.trim()}
          aria-label={t("dashboard.createTimeline.sendMessage")}
        >
          <Send size={16} />
        </button>
      </div>

      {saveError && <p className="create-timeline-modal__turn-error">{saveError}</p>}

      <button type="button" className="create-timeline-modal__save" onClick={save} disabled={loading || saving || movies.length === 0}>
        {saving ? <Spinner size={18} /> : t("dashboard.createTimeline.saveTimeline", { count: movies.length })}
      </button>
    </Modal>
  );
};

export default CreateTimelineModal;
