// src/service/i18n.ts
// Infraestrutura de i18n — pedido explícito da Rebecca: "vamos adicionar
// com i18n ingles e espanhol". POR ENQUANTO só a infraestrutura (lib +
// seletor de idioma + arquivos de tradução com um exemplo só) — decisão
// explícita dela: "Só a infraestrutura, sem traduzir nada ainda... você
// decide depois quando traduzir cada tela". Nenhuma tela do app foi
// migrada pra usar `useTranslation` ainda (continuam com texto em
// português direto no JSX) — isso é trabalho pra rodadas futuras, tela
// por tela.
//
// `pt` é o idioma FONTE (todo o app já está escrito em português) e
// também o `fallbackLng` — uma chave que não existir ainda em en/es (ou
// que nunca for criada por não ter sido traduzida ainda) cai pro
// português em vez de mostrar a chave crua.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import pt from "@/locales/pt/common.json";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";

export const SUPPORTED_LANGUAGES = ["pt", "en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Código de idioma do TMDb pra cada idioma suportado aqui — pedido
// explícito da Rebecca: "os dados que vêm do TMDb... devem mudar de
// idioma [junto]" quando o usuário trocar o idioma do site. Usado por
// `service/TMDbSettings.ts` (`tmdbFetch`) em vez do "pt-BR" fixo de
// antes.
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
      escapeValue: false, // React já escapa — dupla escapagem quebraria acento/HTML legítimo
    },
    detection: {
      // localStorage primeiro (preferência explícita do usuário, ver
      // @/components/languageSwitcher) — só cai pro idioma do navegador
      // (`navigator`) quando o usuário nunca escolheu nada aqui.
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
