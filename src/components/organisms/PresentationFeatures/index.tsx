import type { ReactNode } from "react";
import { CircleCheck, Gift, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import FeatureCard from "@/components/molecules/FeatureCard";
import { ABOUT_FEATURE_IDS, type AboutFeatureId } from "@/actions/presentation/about";
import "./style.scss";

const ICON_SIZE = 28;

const ICONS: Record<AboutFeatureId, ReactNode> = {
  track: <CircleCheck size={ICON_SIZE} strokeWidth={2.4} color="#62D98A" />,
  discover: <Gift size={ICON_SIZE} strokeWidth={1.5} color="#00B2FF" />,
  timelines: <Sparkles size={ICON_SIZE} strokeWidth={1.5} color="#D1AD48" />,
};

// Bloco "O que você pode fazer" da aba "Sobre o projeto": chamada, título e os três cartões.
const PresentationFeatures = () => {
  const { t } = useTranslation();

  return (
    <section className="presentation-features">
      <p className="presentation-features__label">{t("presentation.about.featuresLabel")}</p>
      <h2 className="presentation-features__title">{t("presentation.about.featuresTitle")}</h2>

      <div className="presentation-features__cards">
        {ABOUT_FEATURE_IDS.map((id) => (
          <FeatureCard key={id} icon={ICONS[id]} title={t(`presentation.about.features.${id}.title`)} text={t(`presentation.about.features.${id}.text`)} />
        ))}
      </div>
    </section>
  );
};

export default PresentationFeatures;
