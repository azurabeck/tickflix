// src/pages/private/settings/index.tsx
// "Configurações" — item novo do menu da conta (@/components/userMenu),
// mesmo pedido/origem do Profile (ver documents.md de lá). Começa só com
// Idioma (reaproveita @/components/languageSwitcher, já exposto no
// navbar — aqui é o lugar "de verdade" pra essa preferência morar,
// centralizado, não só um atalho solto na nav) porque é a única
// preferência que o app tem até agora; mais seções entram aqui conforme
// surgirem (notificação, privacidade etc.), não precisa de estrutura
// nova pra isso.
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/languageSwitcher";
import GeminiKeyCard from "./GeminiKeyCard";
import "./styles.scss";

const Settings = () => {
  const { t } = useTranslation();

  return (
    <div className="settings-page">
      <div className="settings-page__inner">
        <h1 className="settings-page__title">{t("settings.title")}</h1>

        <section className="settings-page__section">
          <div className="settings-page__section-text">
            <h2 className="settings-page__section-title">{t("settings.language.title")}</h2>
            <p className="settings-page__section-hint">{t("settings.language.hint")}</p>
          </div>
          <LanguageSwitcher />
        </section>

        <GeminiKeyCard />
      </div>
    </div>
  );
};

export default Settings;
