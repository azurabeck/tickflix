import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./style.scss";

interface AwardButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
}

// Botão de ação das telas de premiação (usa a cor de destaque --awards-accent da página).
const AwardButton = ({ children, type = "button", ...rest }: AwardButtonProps) => (
  <button type={type} className="award-button" {...rest}>
    {children}
  </button>
);

export default AwardButton;
