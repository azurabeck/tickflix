export type AboutIconKey = "sparkles" | "check" | "film" | "info";

interface AboutFeature {
  icon: AboutIconKey;
  key: "feature1" | "feature2" | "feature3" | "feature4";
}

// Funcionalidades mostradas na página Sobre (título e descrição vêm das traduções).
// usado em: página Sobre
export const FEATURES: AboutFeature[] = [
  { icon: "sparkles", key: "feature1" },
  { icon: "check", key: "feature2" },
  { icon: "film", key: "feature3" },
  { icon: "info", key: "feature4" },
];

interface AboutStep {
  number: string;
  key: "step1" | "step2" | "step3" | "step4";
}

// Passos do "como funciona" da página Sobre.
// usado em: página Sobre
export const STEPS: AboutStep[] = [
  { number: "01", key: "step1" },
  { number: "02", key: "step2" },
  { number: "03", key: "step3" },
  { number: "04", key: "step4" },
];

// Frases de exemplo de timeline mostradas na página Sobre.
// usado em: página Sobre
export const EXAMPLE_PROMPT_KEYS = ["example1", "example2", "example3", "example4", "example5"] as const;
