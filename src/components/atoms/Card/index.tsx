import type { ReactNode } from "react";
import "./style.scss";

interface CardProps {
  layout?: "row" | "column" | "between";
  size?: "md" | "lg";
  className?: string;
  children: ReactNode;
}

// Caixa com borda arredondada (Perfil/Configurações). "row" = avatar+form, "between" = texto e controle lado a lado.
const Card = ({ layout = "column", size = "md", className, children }: CardProps) => (
  <section className={["card", `card--${layout}`, `card--${size}`, className].filter(Boolean).join(" ")}>{children}</section>
);

export default Card;
