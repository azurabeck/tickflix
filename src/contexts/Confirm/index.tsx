import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import ConfirmDialog, { type ConfirmOptions } from "@/components/atoms/ConfirmDialog";

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Abre a caixa de confirmação e devolve se o usuário confirmou.
// usado em: timelines/mytimelines, MediaCardsProvider
export const useConfirm = (): ConfirmFn => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
  return confirm;
};

// Um diálogo de confirmação por vez; a Promise resolve com true (confirmou) ou false (cancelou).
// usado em: layout das páginas internas
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setDialog(options);
      }),
    []
  );

  const handleResult = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setDialog(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onResult={handleResult} />}
    </ConfirmContext.Provider>
  );
};
