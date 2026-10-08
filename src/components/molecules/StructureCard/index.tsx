import Chip from "@/components/atoms/Chip";
import "./style.scss";

interface StructureCardProps {
  chip: string;
  title: string;
  text: string;
  dark?: boolean; // card escuro (destaque)
}

// Cartão de uma camada da arquitetura: etiqueta, título e uma linha de apoio. Uma linha roxa liga o cartão ao que está à esquerda.
const StructureCard = ({ chip, title, text, dark = false }: StructureCardProps) => (
  <article className={dark ? "structure-card structure-card--dark" : "structure-card"}>
    <Chip variant={dark ? "purple" : "lilac"}>{chip}</Chip>
    <h3 className="structure-card__title">{title}</h3>
    <p className="structure-card__text">{text}</p>
  </article>
);

export default StructureCard;
