// src/pages/public/about/index.tsx
// Landing "/sobre" — explica a proposta do TickFlix e como criar uma
// timeline. Acessível logado ou não (link "saiba mais" no estado vazio
// do Dashboard); "Voltar" leva pra ROUTES.HOME, que App.tsx resolve certo
// nos dois casos (Dashboard se logado, redireciona pro login se não).
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clapperboard, Info, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/logo";
import { ROUTES } from "@/service/Routes";
import { EXAMPLE_PROMPT_KEYS, FEATURES, STEPS, type AboutIconKey } from "./functions";
import "./styles.scss";

const ICONS: Record<AboutIconKey, typeof Sparkles> = {
  sparkles: Sparkles,
  check: CheckCircle2,
  film: Clapperboard,
  info: Info,
};

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="about">
      <nav className="about__nav">
        <div className="about__inner about__nav-inner">
          <Logo />
          <Link to={ROUTES.HOME} className="about__nav-link">
            <ArrowLeft size={16} />
            {t("about.back")}
          </Link>
        </div>
      </nav>

      <header className="about__hero">
        <div className="about__inner">
          <span className="about__eyebrow">{t("about.eyebrow")}</span>
          <h1 className="about__hero-title">{t("about.heroTitle")}</h1>
          <p className="about__hero-subtitle">{t("tagline")}</p>
          <p className="about__hero-lead">{t("about.heroLead")}</p>
          <Link to={ROUTES.HOME} className="about__cta">
            {t("about.startNow")}
            <ArrowRight size={18} />
          </Link>
        </div>
      </header>

      <section className="about__section">
        <div className="about__inner">
          <h2 className="about__section-title">{t("about.featuresTitle")}</h2>
          <div className="about__features">
            {FEATURES.map((feature) => {
              const Icon = ICONS[feature.icon];
              return (
                <div key={feature.key} className="about__feature-card">
                  <div className="about__feature-icon">
                    <Icon size={22} />
                  </div>
                  <h3 className="about__feature-title">{t(`about.features.${feature.key}.title`)}</h3>
                  <p className="about__feature-description">{t(`about.features.${feature.key}.description`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="about__section about__section--dark">
        <div className="about__inner">
          <h2 className="about__section-title about__section-title--light">{t("about.stepsTitle")}</h2>
          <p className="about__section-hint">{t("about.stepsHint")}</p>

          <div className="about__steps">
            {STEPS.map((step) => (
              <div key={step.key} className="about__step">
                <span className="about__step-number">{step.number}</span>
                <div>
                  <h3 className="about__step-title">{t(`about.steps.${step.key}.title`)}</h3>
                  <p className="about__step-description">{t(`about.steps.${step.key}.description`)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="about__examples">
            <span className="about__examples-label">{t("about.examplesLabel")}</span>
            <div className="about__examples-list">
              {EXAMPLE_PROMPT_KEYS.map((key) => (
                <span key={key} className="about__example-chip">
                  "{t(`about.examples.${key}`)}"
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="about__cta-band">
        <div className="about__inner">
          <h2 className="about__cta-title">{t("about.ctaTitle")}</h2>
          <Link to={ROUTES.HOME} className="about__cta about__cta--light">
            {t("about.goToTickFlix")}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="about__footer">
        <div className="about__inner">
          <Logo />
          <span className="about__footer-tagline">{t("tagline")}</span>
        </div>
      </footer>
    </div>
  );
};

export default About;
