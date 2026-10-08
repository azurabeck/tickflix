import { useTranslation } from "react-i18next";
import Chip from "@/components/atoms/Chip";
import StructureCard from "@/components/molecules/StructureCard";
import { FRONTEND_LAYER_IDS, WHERE_TO_FIND_IDS } from "@/actions/presentation/structure";
import treeImage from "@/assets/presentation/structure-tree.png";
import "./style.scss";

// Conteúdo da aba "Estrutura": o mapa do código (frontend, serviços e API), onde encontrar cada coisa e a árvore de pastas ao lado.
const PresentationStructure = () => {
  const { t } = useTranslation();

  return (
    <div className="presentation-structure">
      <header className="presentation-structure__intro">
        <p className="presentation-structure__label">{t("presentation.structure.label")}</p>
        <h2 className="presentation-structure__title">{t("presentation.structure.title")}</h2>
        <p className="presentation-structure__description">{t("presentation.structure.description")}</p>
      </header>

      <div className="presentation-structure__body">
        <div className="presentation-structure__diagram">
          <section className="presentation-structure__frontend">
            <Chip>{t("presentation.structure.frontend.chip")}</Chip>

            <div className="presentation-structure__layers">
              {FRONTEND_LAYER_IDS.map((id) => (
                <div key={id} className="presentation-structure__layer">
                  <h3 className="presentation-structure__layer-title">{t(`presentation.structure.frontend.layers.${id}.title`)}</h3>
                  <p className="presentation-structure__layer-text">{t(`presentation.structure.frontend.layers.${id}.text`)}</p>
                </div>
              ))}
            </div>

            <p className="presentation-structure__example">{t("presentation.structure.frontend.example")}</p>
            <Chip variant="green">{t("presentation.structure.frontend.instant")}</Chip>
          </section>

          <div className="presentation-structure__services">
            <StructureCard dark chip={t("presentation.structure.service.chip")} title={t("presentation.structure.service.title")} text={t("presentation.structure.service.text")} />
            <StructureCard chip={t("presentation.structure.api.chip")} title={t("presentation.structure.api.title")} text={t("presentation.structure.api.text")} />
          </div>
        </div>

        <div className="presentation-structure__where">
          <section className="presentation-structure__where-card">
            <p className="presentation-structure__where-label">{t("presentation.structure.where.label")}</p>
            <div className="presentation-structure__where-items">
              {WHERE_TO_FIND_IDS.map((id) => (
                <div key={id}>
                  <h3 className="presentation-structure__where-title">{t(`presentation.structure.where.items.${id}.title`)}</h3>
                  <p className="presentation-structure__where-text">{t(`presentation.structure.where.items.${id}.text`)}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="presentation-structure__backend">
            <h3 className="presentation-structure__where-title">{t("presentation.structure.backend.title")}</h3>
            <p className="presentation-structure__backend-text">{t("presentation.structure.backend.text")}</p>
          </div>
        </div>
      </div>

      <img className="presentation-structure__image" src={treeImage} alt={t("presentation.structure.treeAlt")} />

      <p className="presentation-structure__note">{t("presentation.structure.note")}</p>
    </div>
  );
};

export default PresentationStructure;
