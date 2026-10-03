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
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clapperboard, FolderPlus, ListPlus } from "lucide-react";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import ExistingTimelineModal from "./ExistingTimelineModal";
import CreateTimelineModal from "./CreateTimelineModal";
import type { AddableMovie } from "./functions";
import "./styles.scss";

interface AddToTimelineButtonProps {
  uid: string | null;
  movie: AddableMovie;
  // "overlay" (padrão): claquete redonda sobre o pôster. "icon": ＋ de 24px
  // em linha (card de sugestão, @/components/suggestionCard) — o menu abre
  // pra cima, alinhado à direita do botão.
  variant?: "overlay" | "icon";
}

const AddToTimelineButton = ({ uid, movie, variant = "overlay" }: AddToTimelineButtonProps) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  // Desloca o menu (via `transform: translateX`, não troca de lado) o
  // tanto que precisar pra caber inteiro na viewport — bug real visto ao
  // vivo testando mobile: ancorado sempre na ESQUERDA do botão, o menu
  // vazava pra fora da tela em qualquer card que não fosse o primeiro de
  // uma fileira que rola horizontalmente. Um flip binário (virar pra
  // direita quando vaza à direita) NÃO bastava — testado ao vivo: pra um
  // botão perto do MEIO de uma tela estreita, virar pra direita só
  // trocava de lado o vazamento (passava a vazar pela esquerda). Medido
  // depois de abrir (`useEffect` abaixo), não dá pra saber de antemão
  // sem o menu já estar no DOM pra medir `getBoundingClientRect`.
  const [menuOffsetX, setMenuOffsetX] = useState(0);
  const [existingOpen, setExistingOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // `useLayoutEffect` (não `useEffect`) — mede e corrige a posição ANTES
  // do navegador pintar a tela, senão o usuário veria o menu "pular" da
  // posição vazando pra posição corrigida por um instante.
  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuOffsetX(0);
      return;
    }
    const rect = menuRef.current?.getBoundingClientRect();
    if (!rect) return;

    const EDGE_MARGIN = 8; // mesma folga das outras bordas de tela do app
    let offset = 0;
    if (rect.right > window.innerWidth - EDGE_MARGIN) {
      offset = window.innerWidth - EDGE_MARGIN - rect.right;
    } else if (rect.left < EDGE_MARGIN) {
      offset = EDGE_MARGIN - rect.left;
    }
    if (offset !== 0) setMenuOffsetX(offset);
  }, [menuOpen]);

  return (
    <div className={variant === "icon" ? "add-to-timeline add-to-timeline--icon" : "add-to-timeline"} ref={wrapperRef}>
      <button
        type="button"
        className="add-to-timeline__button"
        onClick={(e) => {
          e.stopPropagation();
          if (!uid) return;
          setMenuOpen((prev) => !prev);
        }}
        disabled={!uid}
        title={variant === "icon" ? undefined : t("addToTimeline.button")}
        data-tooltip={variant === "icon" ? t("addToTimeline.button") : undefined}
        aria-label={t("addToTimeline.button")}
      >
        {variant === "icon" ? <PlusCircleIcon /> : <Clapperboard size={13} />}
      </button>

      {uid && menuOpen && (
        <div
          ref={menuRef}
          className="add-to-timeline__menu"
          style={menuOffsetX ? { transform: `translateX(${menuOffsetX}px)` } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="add-to-timeline__menu-item"
            onClick={() => {
              setMenuOpen(false);
              setExistingOpen(true);
            }}
          >
            <ListPlus size={14} />
            {t("addToTimeline.addToExisting")}
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
            {t("addToTimeline.createNew")}
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
