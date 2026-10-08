import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./style.scss";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  onResult: (confirmed: boolean) => void;
}

const ConfirmDialog = ({ title, message, confirmLabel, cancelLabel, danger, onResult }: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const confirmButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmButton.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResult(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onResult]);

  return (
    <div className="confirm-dialog__overlay" onClick={() => onResult(false)}>
      <div className="confirm-dialog__panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title ?? t("confirmDialog.title")}
        </h2>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__button confirm-dialog__button--cancel" onClick={() => onResult(false)}>
            {cancelLabel ?? t("confirmDialog.cancel")}
          </button>
          <button
            ref={confirmButton}
            type="button"
            className={danger ? "confirm-dialog__button confirm-dialog__button--danger" : "confirm-dialog__button confirm-dialog__button--confirm"}
            onClick={() => onResult(true)}
          >
            {confirmLabel ?? t("confirmDialog.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
