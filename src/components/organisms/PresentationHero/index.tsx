import { useTranslation } from "react-i18next";
import "./style.scss";

interface PresentationHeroProps {
  onStructure: () => void;
  onFeatures: () => void;
  qrSrc: string; // a imagem do QR code do site
}

// Topo da aba "Sobre o projeto": chamada com dois botões e, ao lado, o QR code do site.
const PresentationHero = ({ onStructure, onFeatures, qrSrc }: PresentationHeroProps) => {
  const { t } = useTranslation();

  return (
    <div className="presentation-hero">
      <div className="presentation-hero__content">
        <div className="presentation-hero__text">
          <p className="presentation-hero__label">{t("presentation.about.label")}</p>
          <h2 className="presentation-hero__title">{t("presentation.about.title")}</h2>
          <p className="presentation-hero__description">{t("presentation.about.description")}</p>
        </div>

        <div className="presentation-hero__actions">
          <button type="button" className="presentation-hero__button presentation-hero__button--primary" onClick={onStructure}>
            {t("presentation.about.seeStructure")}
          </button>
          <button type="button" className="presentation-hero__button presentation-hero__button--outline" onClick={onFeatures}>
            {t("presentation.about.seeFeatures")}
          </button>
        </div>
      </div>

      <img src={qrSrc} alt={t("presentation.about.qrAlt")} className="presentation-hero__qr" />
    </div>
  );
};

export default PresentationHero;
