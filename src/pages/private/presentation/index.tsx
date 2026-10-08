import { useTranslation } from "react-i18next";
import Logo from "@/components/atoms/Logo";
import PageShell from "@/components/atoms/PageShell";
import PresentationCycle from "@/components/organisms/PresentationCycle";
import PresentationFeatures from "@/components/organisms/PresentationFeatures";
import PresentationHero from "@/components/organisms/PresentationHero";
import PresentationStructure from "@/components/organisms/PresentationStructure";
import PresentationTabs from "@/components/organisms/PresentationTabs";
import { getCycle } from "@/actions/presentation/cycles";
import { usePresentationTabs } from "@/actions/presentation/tabs";
import "./style.scss";

// Página Apresentação (menu do usuário): título, abas e o conteúdo da aba escolhida.
// O GIF da aba "Sobre o projeto" entra em `mediaSrc` do PresentationHero (hoje só o retângulo preto).
const Presentation = () => {
  const { t } = useTranslation();
  const menu = usePresentationTabs();
  const isAbout = menu.selection.tab === "about";
  const isStructure = menu.selection.tab === "structure";
  const isCycle = (menu.selection.tab === "cycle" || menu.selection.tab === "problems") && menu.selection.item !== null;
  const cycle = getCycle(menu.selection.item);

  return (
    <PageShell width="wide" style={{ minHeight: 0, padding: "20px 0 24px" }}>
      <header className="presentation-page__header">
        <Logo />
        <p className="presentation-page__subtitle">{t("presentation.title")}</p>
      </header>

      <section className="presentation-page__panel">
        <PresentationTabs menu={menu} />
        {isAbout && <PresentationHero onStructure={() => menu.show("structure")} onFeatures={() => menu.show("cycle", "render")} />}
        {isStructure && <PresentationStructure />}
        {isCycle && cycle && <PresentationCycle key={cycle.id} cycle={cycle} />}
        {isCycle && !cycle && <p className="presentation-page__soon">{t("presentation.cycles.soon")}</p>}
      </section>

      {isAbout && <PresentationFeatures />}
    </PageShell>
  );
};

export default Presentation;
