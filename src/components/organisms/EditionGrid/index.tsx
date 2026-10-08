import { Trophy } from "lucide-react";
import type { AwardEdition } from "@/actions/awards/editions";
import "./style.scss";

interface EditionGridProps {
  editions: AwardEdition[];
  onSelect: (edition: AwardEdition) => void;
}

// Grade com todas as edições de uma premiação: ordinal, ano e o vencedor (quando já resolvido).
const EditionGrid = ({ editions, onSelect }: EditionGridProps) => (
  <div className="edition-grid">
    {editions.map((edition) => (
      <button key={edition.ordinal} type="button" className="edition-grid__card" onClick={() => onSelect(edition)}>
        <span className="edition-grid__ordinal">{edition.ordinal}ª</span>
        <span className="edition-grid__year">{edition.ceremonyYear}</span>
        {edition.headline ? (
          <span className="edition-grid__headline">
            <Trophy size={12} />
            <span className="edition-grid__headline-text">{edition.headline}</span>
          </span>
        ) : (
          <span className="edition-grid__headline edition-grid__headline--pending">Indicados em breve</span>
        )}
      </button>
    ))}
  </div>
);

export default EditionGrid;
