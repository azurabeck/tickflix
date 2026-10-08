import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import StatusMessage from "@/components/atoms/StatusMessage";
import "./style.scss";

interface DetailPanelProps {
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
  children?: ReactNode;
}

// Painel de detalhe (filme/série) por cima da página: Esc e clique fora fecham.
const DetailPanel = ({ onClose, loading, error, children }: DetailPanelProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="detail-panel__overlay" onClick={onClose}>
      <div className="detail-panel__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="detail-panel__close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        {loading && (
          <div className="detail-panel__status">
            <StatusMessage variant="loading" spinner>
              Carregando detalhes...
            </StatusMessage>
          </div>
        )}
        {error && (
          <div className="detail-panel__status">
            <StatusMessage variant="error">{error}</StatusMessage>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default DetailPanel;
