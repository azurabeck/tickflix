// src/components/languageSwitcher/index.tsx
// Seletor de idioma GLOBAL — pedido explícito da Rebecca: "vamos
// adicionar com i18n ingles e espanhol". Mesmo padrão de peça global já
// usado no app (WatchButton/AvailabilityBadge): burro, só troca o idioma
// ativo do i18next (`i18n.changeLanguage`) — persiste sozinho em
// localStorage (ver `detection.caches` em service/i18n.ts), não precisa
// de estado próprio aqui.
//
// POR ENQUANTO só troca o idioma de VERDADE pros dados do TMDb (título/
// sinopse/gênero — já ligados em service/TMDbSettings.ts) — nenhuma tela
// do app foi migrada pra usar chaves de tradução ainda (decisão
// explícita da Rebecca: infraestrutura primeiro, telas traduzidas depois,
// uma de cada vez).
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/service/i18n";
import "./styles.scss";

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
  // `i18n.language` pode vir como locale completo do navegador
  // ("en-US") — só os 2 primeiros caracteres decidem qual botão fica
  // ativo (mesmo corte usado em service/TMDbSettings.ts).
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
