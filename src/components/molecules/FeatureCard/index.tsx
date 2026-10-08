import type { ReactNode } from "react";
import "./style.scss";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  text: string;
}

// Cartão com ícone, título e uma frase (ex.: "Acompanhe").
const FeatureCard = ({ icon, title, text }: FeatureCardProps) => (
  <article className="feature-card">
    <h3 className="feature-card__title">{title}</h3>
    <span className="feature-card__icon" aria-hidden="true">
      {icon}
    </span>
    <p className="feature-card__text">{text}</p>
  </article>
);

export default FeatureCard;
