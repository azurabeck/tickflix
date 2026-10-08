import { useTranslation } from "react-i18next";
import type { TrailRow } from "@/actions/presentation/cycles";
import "./style.scss";

interface CycleTrailProps {
  rows: TrailRow[];
  onSelect: (path: string[]) => void;
}

// Trilha de um ciclo: uma linha com as etapas principais, na ordem em que acontecem. Ao escolher uma etapa que faz várias coisas, abre-se
// logo abaixo uma linha com o que tem dentro dela (e assim por diante). A etapa escolhida fica roxa, o caminho até ela fica com borda roxa
// e as etapas que já passaram ficam claras.
const CycleTrail = ({ rows, onSelect }: CycleTrailProps) => {
  const { t } = useTranslation();

  return (
    <div className="cycle-trail">
      {rows.map((row, depth) => (
        <div key={row.parentLabel ?? "main"} className={`cycle-trail__row cycle-trail__row--${Math.min(depth, 2)}`}>
          {row.parentLabel && <span className="cycle-trail__row-label">{t("presentation.cycles.inside", { label: row.parentLabel })}</span>}
          <ol className="cycle-trail__steps">
            {row.nodes.map((node) => (
              <li key={node.step.id}>
                <button
                  type="button"
                  className={`cycle-trail__step cycle-trail__step--${node.state}`}
                  onClick={() => onSelect(node.path)}
                  aria-current={node.state === "current" ? "step" : undefined}
                >
                  <span className="cycle-trail__label">{node.label}</span>
                  <span className="cycle-trail__title">{node.step.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
};

export default CycleTrail;
