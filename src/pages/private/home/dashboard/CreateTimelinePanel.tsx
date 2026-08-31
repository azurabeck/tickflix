// src/pages/private/home/dashboard/CreateTimelinePanel.tsx
// Painel "Criar uma nova timeline": um input só (com o botão do lado).
// Clicar em "criar timeline" NÃO grava nada direto — abre
// CreateTimelineModal.tsx, que mostra a lista que a IA foi buscar e deixa
// ajustar o pedido antes de confirmar, garantindo que o resultado é
// mesmo o que o usuário queria.
//
// Reusado também nas páginas Séries (`categoryLock="series"`) e Animes
// (`categoryLock="animes"`) — pedido explícito da Rebecca: "vamos fazer
// essa mesma estrutura inicial da página de filmes para a página de
// séries/animes... é o mesmo só que relativo a séries/animes". Mesmo
// componente, mesmas classes `dashboard__create-*` (CSS já global, ver
// home/dashboard/styles.scss) — só o placeholder muda pra dar exemplo
// relevante, e o lock viaja até resolveTimelineMovies via
// CreateTimelineModal.
import { useState } from "react";
import type { ContentType } from "@/service/TimelineSettings";
import CreateTimelineModal from "./CreateTimelineModal";

interface CreateTimelinePanelProps {
  uid: string | null;
  // Opcional — a Home não precisa mais reagir a isso (não lê timelines
  // pra nada aqui, "Últimos vistos" hoje vem direto do estado global de
  // "já vi", ver service/WatchedSettings.ts). Continua existindo pra
  // quem quiser saber quando uma timeline nova foi criada.
  onCreated?: () => void;
  // "series"/"animes" quando chamado das páginas Séries/Animes —
  // resultado restrito (e, pra anime, ao gênero/país), timeline sai com
  // essa categoria (ver resolveTimelineMovies, home/dashboard/functions.ts).
  // Omitido = comportamento de sempre (categoria "filmes").
  categoryLock?: ContentType;
  placeholder?: string;
}

const DEFAULT_PLACEHOLDER = "Descreva a timeline que você quer. Exemplo: só os filmes do Tom Cruise, ou todos os filmes do The Rock";

const CreateTimelinePanel = ({ uid, onCreated, categoryLock, placeholder = DEFAULT_PLACEHOLDER }: CreateTimelinePanelProps) => {
  const [description, setDescription] = useState("");
  const [modalDescription, setModalDescription] = useState<string | null>(null);

  const handleOpenModal = () => {
    if (!uid || !description.trim()) return;
    setModalDescription(description.trim());
  };

  const handleSaved = () => {
    setModalDescription(null);
    setDescription("");
    onCreated?.();
  };

  return (
    <>
      <section className="dashboard__create-band">
        <div className="dashboard__inner dashboard__create-inner">
          <input
            type="text"
            className="dashboard__create-input"
            placeholder={placeholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOpenModal()}
          />

          <button
            type="button"
            className="dashboard__create-button"
            disabled={!uid || !description.trim()}
            onClick={handleOpenModal}
          >
            criar timeline
          </button>
        </div>
      </section>

      {modalDescription && uid && (
        <CreateTimelineModal
          uid={uid}
          initialDescription={modalDescription}
          onClose={() => setModalDescription(null)}
          onSaved={handleSaved}
          categoryLock={categoryLock}
        />
      )}
    </>
  );
};

export default CreateTimelinePanel;
