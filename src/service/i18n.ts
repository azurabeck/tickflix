import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import pt from "@/locales/pt/common.json";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";

// usado no seletor de idioma (LanguageSwitcher) e na configuração do i18next abaixo.
export const SUPPORTED_LANGUAGES = ["pt", "en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Idioma do app -> idioma pedido ao TMDb. usado nas chamadas ao TMDb e nos dashboards de Filmes e Séries/Animes (idioma enviado ao backend).
export const TMDB_LANGUAGE_BY_APP_LANGUAGE: Record<SupportedLanguage, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { common: pt },
      en: { common: en },
      es: { common: es },
    },
    fallbackLng: "pt",
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
