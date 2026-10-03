// src/pages/private/home/dashboard/HomeSection.tsx
// Uma SEÇÃO da Home: um painel #EFEFEF com título roxo e conteúdo. As seções
// ficam dentro de um HomeGroup (HomeGroup.tsx — a faixa #F5F5F5 que dá a
// largura máxima e o espaço de 16px entre elas); seções podem ir sozinhas
// numa linha ou lado a lado (HomeRow). Cuida do estado de carregando/erro
// pra quem usa só passar o conteúdo. `actions` ocupa o lado DIREITO da
// linha do título (ex.: os controles `◀ ver todos ▶` das fileiras, ver
// ScrollRail.tsx).
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface HomeSectionProps {
  title?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  // Elementos extras entre o título e o conteúdo (ex.: chips de mês).
  toolbar?: ReactNode;
  className?: string;
  children: ReactNode;
}

const HomeSection = ({ title, actions, loading, error, toolbar, className, children }: HomeSectionProps) => {
  const { t } = useTranslation();

  return (
    <section className={className ? `home-section ${className}` : "home-section"}>
      {(title || actions) && (
        <div className="home-section__header">
          {title && <h2 className="home-section__title">{title}</h2>}
          {actions}
        </div>
      )}
      {toolbar}
      {loading && <p className="dashboard__loading">{t("dashboard.loading")}</p>}
      {error && <p className="dashboard__error">{error}</p>}
      {!loading && !error && children}
    </section>
  );
};

export default HomeSection;
