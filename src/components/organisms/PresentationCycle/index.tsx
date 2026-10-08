import { useTranslation } from "react-i18next";
import Chip from "@/components/atoms/Chip";
import CodeBlock from "@/components/atoms/CodeBlock";
import CycleTrail from "@/components/molecules/CycleTrail";
import { useCycleView, type Cycle } from "@/actions/presentation/cycles";
import "./style.scss";

interface PresentationCycleProps {
  cycle: Cycle;
}

// Página de um ciclo: título, trilha de etapas clicáveis e, da etapa escolhida, a explicação e o código real (com arquivo e função).
const PresentationCycle = ({ cycle }: PresentationCycleProps) => {
  const { t } = useTranslation();
  const view = useCycleView(cycle);
  const { step, snippet } = view;

  return (
    <div className={cycle.problem ? "presentation-cycle presentation-cycle--problem" : "presentation-cycle"}>
      <header className="presentation-cycle__intro">
        <p className="presentation-cycle__label">{t(cycle.problem ? "presentation.cycles.problemLabel" : "presentation.cycles.label")}</p>
        <h2 className="presentation-cycle__title">{cycle.title}</h2>
        <p className="presentation-cycle__description">{cycle.intro}</p>
      </header>

      {cycle.problem && (
        <div className="presentation-cycle__problem">
          <section className="presentation-cycle__problem-card">
            <h3 className="presentation-cycle__problem-title">{t("presentation.cycles.why")}</h3>
            <p className="presentation-cycle__problem-text">{cycle.problem.why}</p>
          </section>
          <section className="presentation-cycle__problem-card presentation-cycle__problem-card--solution">
            <h3 className="presentation-cycle__problem-title">{t("presentation.cycles.what")}</h3>
            <p className="presentation-cycle__problem-text">{cycle.problem.what}</p>
          </section>
        </div>
      )}

      {cycle.problem && <p className="presentation-cycle__label">{t("presentation.cycles.lifecycle")}</p>}
      <CycleTrail rows={view.rows} onSelect={view.select} />

      <div className="presentation-cycle__body">
        <article className="presentation-cycle__explanation">
          <div className="presentation-cycle__tags">
            <Chip variant="purple">{t("presentation.cycles.step", { label: view.label })}</Chip>
            {step.lane && <Chip>{t(`presentation.cycles.lanes.${step.lane}`)}</Chip>}
          </div>
          <h3 className="presentation-cycle__step-title">{step.title}</h3>
          <p className="presentation-cycle__step-text">{step.text}</p>
          {step.note && <p className="presentation-cycle__note">{step.note}</p>}

          <dl className="presentation-cycle__location">
            <dt>{t("presentation.cycles.file")}</dt>
            <dd>
              {step.code.file}
              {snippet.status === "ready" && `:${snippet.snippet.firstLine}-${snippet.snippet.lastLine}`}
            </dd>
            <dt>{t("presentation.cycles.function")}</dt>
            <dd>{step.code.name}</dd>
          </dl>

          <div className="presentation-cycle__nav">
            <button type="button" className="presentation-cycle__nav-button" disabled={!view.hasPrevious} onClick={view.previous}>
              {t("presentation.cycles.previous")}
            </button>
            <button type="button" className="presentation-cycle__nav-button presentation-cycle__nav-button--primary" disabled={!view.hasNext} onClick={view.next}>
              {t("presentation.cycles.next")}
            </button>
          </div>
        </article>

        <div className="presentation-cycle__code">
          {snippet.status === "ready" && <CodeBlock code={snippet.snippet.code} firstLine={snippet.snippet.firstLine} />}
          {snippet.status === "loading" && <p className="presentation-cycle__code-message">{t("presentation.cycles.loadingCode")}</p>}
          {snippet.status === "missing" && <p className="presentation-cycle__code-message">{t("presentation.cycles.missingCode")}</p>}
        </div>
      </div>
    </div>
  );
};

export default PresentationCycle;
