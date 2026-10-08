// Os cartões "O que você pode fazer" da aba "Sobre o projeto", na ordem em que aparecem (textos em `presentation.about.features.<id>`).
// usado em: PresentationFeatures
export const ABOUT_FEATURE_IDS = ["track", "discover", "timelines"] as const;

// Id de um cartão da aba "Sobre o projeto".
// usado em: PresentationFeatures
export type AboutFeatureId = (typeof ABOUT_FEATURE_IDS)[number];
