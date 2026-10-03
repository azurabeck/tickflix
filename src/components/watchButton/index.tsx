// src/components/watchButton/index.tsx
// Ícone de bookmark (outline = não visto, sólido = visto) com tooltip —
// o toggle de "já vi" de todo card de filme do app: fileiras da home
// (Últimos vistos/Em cartaz/Bilheteria), resultado de busca do rodapé,
// grade de uma timeline, indicado de uma categoria do Oscar. Global de
// propósito (não pertence a nenhuma página específica) — antes cada
// lugar tinha seu próprio botão (texto grande, ou par outline/check),
// pedido explícito da Rebecca pra virar só esse ícone em todo canto.
//
// Pensado pra ficar de sobreposição no canto do pôster — o pai precisa
// de `position: relative` (ver rail-card, timelines-page__movie
// etc.); `stopPropagation` no clique porque o pôster costuma estar
// dentro (ou ao lado) de um botão "abrir detalhes" que não pode disparar
// junto.
import { useTranslation } from "react-i18next";
import { Bookmark } from "lucide-react";
import "./styles.scss";

interface WatchButtonProps {
  isWatched: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: number;
  // "overlay" (padrão) = sobreposto no canto do pôster, posição absoluta
  // — pai precisa de `position: relative`. "inline" = fica no fluxo
  // normal (ex.: ao lado de um título num dialog de detalhe), sem
  // posicionamento próprio.
  variant?: "overlay" | "inline";
}

const WatchButton = ({ isWatched, onToggle, disabled, size = 15, variant = "overlay" }: WatchButtonProps) => {
  const { t } = useTranslation();
  const label = t(isWatched ? "watchButton.unmark" : "watchButton.mark");

  return (
    <button
      type="button"
      className={[
        "watch-button",
        variant === "inline" && "watch-button--inline",
        isWatched && "watch-button--active",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <Bookmark size={size} fill={isWatched ? "currentColor" : "none"} />
    </button>
  );
};

export default WatchButton;
