import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageContainer from "@/components/atoms/PageContainer";
import CreateTimelineModal from "@/components/organisms/CreateTimelineModal";
import type { ContentType } from "@/actions/helpers/timelines";
import "./style.scss";

interface CreateTimelinePanelProps {
  uid: string | null;
  categoryLock?: ContentType;
  placeholder?: string;
}

// Faixa "Criar uma nova timeline": o texto digitado abre o modal que monta a timeline com IA.
const CreateTimelinePanel = ({ uid, categoryLock, placeholder }: CreateTimelinePanelProps) => {
  const { t } = useTranslation();
  const [description, setDescription] = useState("");
  const [modalDescription, setModalDescription] = useState<string | null>(null);

  const handleOpenModal = () => {
    if (!uid || !description.trim()) return;
    setModalDescription(description.trim());
  };

  // Recarrega a página para a nova timeline aparecer na lista.
  const handleSaved = () => window.location.reload();

  return (
    <>
      <section className="create-timeline-panel">
        <PageContainer className="create-timeline-panel__inner">
          <input
            type="text"
            className="create-timeline-panel__input"
            placeholder={placeholder ?? t("dashboard.createTimeline.placeholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOpenModal()}
          />

          <button type="button" className="create-timeline-panel__button" disabled={!uid || !description.trim()} onClick={handleOpenModal}>
            {t("dashboard.createTimeline.button")}
          </button>
        </PageContainer>
      </section>

      {modalDescription && uid && (
        <CreateTimelineModal uid={uid} initialDescription={modalDescription} onClose={() => setModalDescription(null)} onSaved={handleSaved} categoryLock={categoryLock} />
      )}
    </>
  );
};

export default CreateTimelinePanel;
