// src/pages/public/about/functions.ts
// Conteúdo da landing "/sobre" — só a ESTRUTURA (ícone, número, qual
// chave de tradução usar) mora aqui; o texto de verdade (título/
// descrição) vem de `t("about.features.*"/"about.steps.*"/"about.examples.*")`,
// src/locales/{pt,en,es}/common.json — i18n só funciona dentro de
// componente (`useTranslation`), por isso não dá pra montar o texto
// final aqui fora de um.

export type AboutIconKey = "sparkles" | "check" | "film" | "info";

export interface AboutFeature {
  icon: AboutIconKey;
  key: "feature1" | "feature2" | "feature3" | "feature4";
}

export const FEATURES: AboutFeature[] = [
  { icon: "sparkles", key: "feature1" },
  { icon: "check", key: "feature2" },
  { icon: "film", key: "feature3" },
  { icon: "info", key: "feature4" },
];

export interface AboutStep {
  number: string;
  key: "step1" | "step2" | "step3" | "step4";
}

export const STEPS: AboutStep[] = [
  { number: "01", key: "step1" },
  { number: "02", key: "step2" },
  { number: "03", key: "step3" },
  { number: "04", key: "step4" },
];

// Exemplos reais de descrição — mostrados como chips na landing, cobrindo
// os eixos que a busca resolve de forma determinística (pessoa, franquia,
// gênero + época + idioma, estúdio, escopo "só os principais").
export const EXAMPLE_PROMPT_KEYS = ["example1", "example2", "example3", "example4", "example5"] as const;
