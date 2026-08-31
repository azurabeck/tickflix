// src/pages/private/awards/EditionGrid.tsx
// Tela inicial da página de premiação — grade com todas as edições, mais
// recente primeiro. Clicar abre EditionDetail (categorias + indicados).
// Generalização de pages/private/oscar/EditionGrid.tsx — idêntico, só
// recebendo `config` pra decorar o card do jeito certo (ordinal + rótulo
// já vêm prontos de `edition`, não precisa de config aqui de verdade,
// mas mantém a assinatura consistente com o resto do módulo).
import { Trophy } from "lucide-react";
import type { AwardEdition } from "./functions";

interface EditionGridProps {
  editions: AwardEdition[];
  onSelect: (edition: AwardEdition) => void;
}

const EditionGrid = ({ editions, onSelect }: EditionGridProps) => (
  <div className="awards__grid">
    {editions.map((edition) => (
      <button key={edition.ordinal} type="button" className="awards__edition-card" onClick={() => onSelect(edition)}>
        <span className="awards__edition-ordinal">{edition.ordinal}ª</span>
        <span className="awards__edition-year">{edition.ceremonyYear}</span>
        {edition.headline ? (
          <span className="awards__edition-headline">
            <Trophy size={12} />
            <span className="awards__edition-headline-text">{edition.headline}</span>
          </span>
        ) : (
          <span className="awards__edition-headline awards__edition-headline--pending">Indicados em breve</span>
        )}
      </button>
    ))}
  </div>
);

export default EditionGrid;
