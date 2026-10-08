import { useTranslation } from "react-i18next";
import Card from "@/components/atoms/Card";
import LanguageSwitcher from "@/components/atoms/LanguageSwitcher";
import PageShell from "@/components/atoms/PageShell";
import GeminiKeyCard from "@/components/organisms/GeminiKeyCard";
import "./style.scss";

const Settings = () => {
  const { t } = useTranslation();

  return (
    <PageShell title={t("settings.title")}>
      <Card layout="between">
        <div className="settings-page__text">
          <h2 className="settings-page__title">{t("settings.language.title")}</h2>
          <p className="settings-page__hint">{t("settings.language.hint")}</p>
        </div>
        <LanguageSwitcher />
      </Card>

      <GeminiKeyCard />
    </PageShell>
  );
};

export default Settings;
