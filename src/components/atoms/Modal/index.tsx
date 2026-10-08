import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import "./style.scss";

interface ModalProps {
  onClose: () => void;
  title?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  scroll?: "panel" | "content";
  className?: string;
  children: ReactNode;
}

const Modal = ({ onClose, title, size = "md", scroll = "panel", className, children }: ModalProps) => {
  const { t } = useTranslation();
  const panelClasses = ["modal__panel", `modal__panel--${size}`, scroll === "content" && "modal__panel--fixed", className].filter(Boolean).join(" ");

  return (
    <div className="modal__overlay" onClick={onClose}>
      <div className={panelClasses} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label={t("close")}>
          <X size={20} />
        </button>
        {title && <h2 className="modal__title">{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export default Modal;
