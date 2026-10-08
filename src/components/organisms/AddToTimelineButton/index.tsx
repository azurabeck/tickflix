import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderPlus, ListPlus } from "lucide-react";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import AddToTimelineCreateModal from "@/components/organisms/AddToTimelineCreateModal";
import AddToTimelineExistingModal from "@/components/organisms/AddToTimelineExistingModal";
import type { AddableMovie } from "@/actions/helpers/addtotimeline";
import { useMenuViewportOffset } from "@/actions/helpers/menuoffset";
import "./style.scss";

interface AddToTimelineButtonProps {
  uid: string | null;
  movie: AddableMovie;
}

// Botão "+" com menu: adicionar a uma timeline existente ou criar uma nova.
const AddToTimelineButton = ({ uid, movie }: AddToTimelineButtonProps) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [existingOpen, setExistingOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuOffsetX = useMenuViewportOffset(menuRef, menuOpen);

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
        data-tooltip={t("addToTimeline.button")}
        aria-label={t("addToTimeline.button")}
      >
        <PlusCircleIcon />
      </button>

      {uid && menuOpen && (
        <div ref={menuRef} className="add-to-timeline__menu" style={menuOffsetX ? { transform: `translateX(${menuOffsetX}px)` } : undefined} onClick={(e) => e.stopPropagation()}>
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
          <AddToTimelineExistingModal uid={uid} movie={movie} onClose={() => setExistingOpen(false)} />
        </div>
      )}

      {uid && createOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <AddToTimelineCreateModal uid={uid} initialMovie={movie} onClose={() => setCreateOpen(false)} onSaved={() => setCreateOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default AddToTimelineButton;
