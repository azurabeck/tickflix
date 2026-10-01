// src/components/addToTimelineButton/index.tsx
// Claquete GLOBAL — pedido explícito da Rebecca: "o simbolo de claquete
// troca pra um simbolo de player (disponibilidade, ver
// @/components/availabilityBadge)... e o simbolo de claquete passa a ser
// pra adicionar a uma timeline, quando clica abre um menu com adicionar a
// timeline existe ou criar nova timeline". Mesmo padrão de peça global já
// estabelecido (WatchButton/AvailabilityBadge): quem usa só passa
// `uid`+o filme/série do card, não sabe nada do que acontece dentro.
//
// Canto INFERIOR ESQUERDO por padrão (pedido explícito, pra não brigar
// com o player — topo-esquerdo — nem com o WatchButton/outro botão
// primário — topo-direito). Em páginas onde esse canto já tem outro selo
// (nenhuma hoje — Séries/Animes/Awards empurraram o PLAYER pro
// inferior-direito exatamente pra deixar esse canto livre pra claquete,
// ver styles.scss de cada uma), fica sempre aqui.
import { useEffect, useRef, useState } from "react";
import { Clapperboard, FolderPlus, ListPlus } from "lucide-react";
import ExistingTimelineModal from "./ExistingTimelineModal";
import CreateTimelineModal from "./CreateTimelineModal";
import type { AddableMovie } from "./functions";
import "./styles.scss";

interface AddToTimelineButtonProps {
  uid: string | null;
  movie: AddableMovie;
}

const AddToTimelineButton = ({ uid, movie }: AddToTimelineButtonProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [existingOpen, setExistingOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora — mesmo padrão já usado pelos dropdowns da nav
  // (@/components/appNav, NavDropdown).
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="add-to-timeline" ref={wrapperRef}>
      <button
        type="button"
        className="add-to-timeline__button"
        onClick={(e) => {
          e.stopPropagation();
          if (!uid) return;
          setMenuOpen((prev) => !prev);
        }}
        disabled={!uid}
        title="Adicionar a uma timeline"
        aria-label="Adicionar a uma timeline"
      >
        <Clapperboard size={13} />
      </button>

      {uid && menuOpen && (
        <div className="add-to-timeline__menu" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="add-to-timeline__menu-item"
            onClick={() => {
              setMenuOpen(false);
              setExistingOpen(true);
            }}
          >
            <ListPlus size={14} />
            Adicionar a timeline existente
          </button>
          <button
            type="button"
            className="add-to-timeline__menu-item"
            onClick={() => {
              setMenuOpen(false);
              setCreateOpen(true);
            }}
          >
            <FolderPlus size={14} />
            Criar nova timeline
          </button>
        </div>
      )}

      {uid && existingOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ExistingTimelineModal uid={uid} movie={movie} onClose={() => setExistingOpen(false)} />
        </div>
      )}

      {uid && createOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <CreateTimelineModal uid={uid} initialMovie={movie} onClose={() => setCreateOpen(false)} onSaved={() => setCreateOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default AddToTimelineButton;
