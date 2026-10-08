import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/service/i18n";
import "./style.scss";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
};

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const current = (i18n.language ?? "pt").slice(0, 2) as SupportedLanguage;

  return (
    <div className="language-switcher" role="group" aria-label="Idioma">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          className={current === lang ? "language-switcher__item language-switcher__item--active" : "language-switcher__item"}
          onClick={() => i18n.changeLanguage(lang)}
          title={LANGUAGE_NAMES[lang]}
          aria-label={LANGUAGE_NAMES[lang]}
          aria-pressed={current === lang}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
