// src/components/confirmDialog/index.tsx
// Diálogo de CONFIRMAÇÃO no estilo do site (no lugar do `window.confirm` do
// navegador). Uso:
//
//   const confirm = useConfirm();
//   if (await confirm({ title: "Apagar?", message: "Não dá pra desfazer.", danger: true })) { ... }
//
// `ConfirmProvider` (montado em PrivateLayout) guarda o diálogo aberto e
// resolve a Promise com true (confirmou) ou false (cancelou, Esc ou clique
// fora). Só um diálogo por vez.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./styles.scss";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Ação destrutiva (apagar, deixar de seguir): botão de confirmar em vermelho.
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
  return confirm;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false); // um só por vez: o anterior (se houver) conta como cancelado
        resolver.current = resolve;
        setDialog(options);
      }),
    []
  );

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    confirmButton.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dialog, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {dialog && (
        <div className="confirm-dialog__overlay" onClick={() => close(false)}>
          <div className="confirm-dialog__panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="confirm-dialog-title" className="confirm-dialog__title">
              {dialog.title ?? t("confirmDialog.title")}
            </h2>
            <p className="confirm-dialog__message">{dialog.message}</p>
            <div className="confirm-dialog__actions">
              <button type="button" className="confirm-dialog__button confirm-dialog__button--cancel" onClick={() => close(false)}>
                {dialog.cancelLabel ?? t("confirmDialog.cancel")}
              </button>
              <button
                ref={confirmButton}
                type="button"
                className={dialog.danger ? "confirm-dialog__button confirm-dialog__button--danger" : "confirm-dialog__button confirm-dialog__button--confirm"}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? t("confirmDialog.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
