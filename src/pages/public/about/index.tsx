// src/pages/public/about/index.tsx
// Landing "/sobre" — explica a proposta do TickFlix e como criar uma
// timeline. Acessível logado ou não (link "saiba mais" no estado vazio
// do Dashboard); "Voltar" leva pra ROUTES.HOME, que App.tsx resolve certo
// nos dois casos (Dashboard se logado, redireciona pro login se não).
import { CheckCircle2, Clapperboard, Info, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/logo";
import { APP_TAGLINE } from "@/service/IASettings";
import { ROUTES } from "@/service/Routes";
import { EXAMPLE_PROMPTS, FEATURES, STEPS, type AboutIconKey } from "./functions";
import "./styles.scss";

const ICONS: Record<AboutIconKey, typeof Sparkles> = {
  sparkles: Sparkles,
  check: CheckCircle2,
  film: Clapperboard,
  info: Info,
};

const About = () => (
  <div className="about">
    <nav className="about__nav">
      <div className="about__inner about__nav-inner">
        <Logo />
        <Link to={ROUTES.HOME} className="about__nav-link">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>
    </nav>

    <header className="about__hero">
      <div className="about__inner">
        <span className="about__eyebrow">Sobre o TickFlix</span>
        <h1 className="about__hero-title">Toda timeline que você quiser assistir, montada por você.</h1>
        <p className="about__hero-subtitle">{APP_TAGLINE}</p>
        <p className="about__hero-lead">
          Sem categoria pra marcar, sem etapa pra seguir. Você descreve o que quer assistir com suas
          próprias palavras e o TickFlix monta a lista de verdade — completa, e com os títulos certos.
        </p>
        <Link to={ROUTES.HOME} className="about__cta">
          Começar agora
          <ArrowRight size={18} />
        </Link>
      </div>
    </header>

    <section className="about__section">
      <div className="about__inner">
        <h2 className="about__section-title">O que dá pra fazer aqui</h2>
        <div className="about__features">
          {FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon];
            return (
              <div key={feature.title} className="about__feature-card">
                <div className="about__feature-icon">
                  <Icon size={22} />
                </div>
                <h3 className="about__feature-title">{feature.title}</h3>
                <p className="about__feature-description">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    <section className="about__section about__section--dark">
      <div className="about__inner">
        <h2 className="about__section-title about__section-title--light">Como criar uma timeline</h2>
        <p className="about__section-hint">Quatro passos — e o primeiro é o único que você realmente escreve.</p>

        <div className="about__steps">
          {STEPS.map((step) => (
            <div key={step.number} className="about__step">
              <span className="about__step-number">{step.number}</span>
              <div>
                <h3 className="about__step-title">{step.title}</h3>
                <p className="about__step-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="about__examples">
          <span className="about__examples-label">exemplos de descrição:</span>
          <div className="about__examples-list">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <span key={prompt} className="about__example-chip">
                "{prompt}"
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="about__cta-band">
      <div className="about__inner">
        <h2 className="about__cta-title">Pronto pra montar a sua primeira timeline?</h2>
        <Link to={ROUTES.HOME} className="about__cta about__cta--light">
          Ir pro TickFlix
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>

    <footer className="about__footer">
      <div className="about__inner">
        <Logo />
        <span className="about__footer-tagline">{APP_TAGLINE}</span>
      </div>
    </footer>
  </div>
);

export default About;
