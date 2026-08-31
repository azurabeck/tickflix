// src/pages/private/awards/awardConfigs.ts
// Generalização da página Oscar (única premiação antes) pra virar UM
// componente reusado 3x — pedido explícito da Rebecca: "agora na nav o
// menu oscar tb vai virar um dropdown: Oscar // a pagina de oscar que já
// criamos, Globo de Ouro, Vestival de Canes [Festival de Cannes]", depois
// confirmado (AskUserQuestion) como "Mesma estrutura da Oscar,
// parametrizada" — um componente genérico "Awards" só trocando o nome do
// prêmio e as categorias reais de cada um. Tudo que muda entre as três
// premiações mora AQUI, num objeto de configuração; o resto do módulo
// (functions.ts, EditionGrid/EditionDetail/AddDataModal, timelineSync.ts,
// index.tsx) é 100% genérico, sem `if (slug === "oscar")` espalhado.
export interface AwardConfig {
  slug: string; // "oscar" | "globo-de-ouro" | "cannes" — chave de tudo (rota, Timeline.awardSlug, cor)
  name: string; // "Oscar", nome curto usado em título/rótulo
  // Nome da collection do Firestore onde as edições cadastradas ficam
  // (doc id = ordinal). O Oscar mantém "oscar" — é a collection de
  // verdade já em uso em produção, não pode mudar de nome sem perder o
  // dado já cadastrado pela Rebecca.
  collectionName: string;
  firstYear: number; // ano da 1ª cerimônia/edição
  lastYear: number; // ano da edição mais recente mostrada na grade
  // Como cada card/título nomeia a edição — "cerimônia do Oscar" (edição
  // é uma CERIMÔNIA), "edição do Festival de Cannes" (Cannes não é uma
  // cerimônia de prêmios no mesmo sentido, é um FESTIVAL com uma edição
  // anual).
  editionNoun: string;
  // 1 = a edição premia filmes do ano ANTERIOR à cerimônia (Oscar, Globo
  // de Ouro — a cerimônia de janeiro/março premia os filmes do ano
  // passado). 0 = premia filmes do MESMO ano (Cannes — o festival exibe e
  // premia filmes que estreiam nele, no próprio ano da edição).
  filmYearOffset: 0 | 1;
  // Categoria usada como "headline" do card na grade (vencedor dela vira
  // o texto mostrado) — a principal/mais reconhecida de cada premiação.
  bestCategoryName: string;
  accentColor: string; // cor de destaque da página (era fixo $gold, só do Oscar)
}

export const OSCAR_CONFIG: AwardConfig = {
  slug: "oscar",
  name: "Oscar",
  collectionName: "oscar",
  firstYear: 1929,
  lastYear: 2026,
  editionNoun: "cerimônia do Oscar",
  filmYearOffset: 1,
  bestCategoryName: "Melhor Filme",
  accentColor: "#d4af37",
};

export const GOLDEN_GLOBES_CONFIG: AwardConfig = {
  slug: "globo-de-ouro",
  name: "Globo de Ouro",
  collectionName: "globoDeOuro",
  firstYear: 1944,
  lastYear: 2026,
  editionNoun: "cerimônia do Globo de Ouro",
  filmYearOffset: 1,
  // O Globo de Ouro tem DUAS categorias de "Melhor Filme" (Drama /
  // Comédia ou Musical) — usa Drama como referência do headline; se essa
  // categoria não tiver sido cadastrada, o cálculo do headline já cai no
  // vencedor da primeira categoria cadastrada (ver functions.ts).
  bestCategoryName: "Melhor Filme - Drama",
  accentColor: "#4a7fd6",
};

export const CANNES_CONFIG: AwardConfig = {
  slug: "cannes",
  name: "Festival de Cannes",
  collectionName: "cannes",
  firstYear: 1946,
  lastYear: 2026,
  editionNoun: "edição do Festival de Cannes",
  filmYearOffset: 0,
  bestCategoryName: "Palma de Ouro",
  accentColor: "#c81d3f",
};

export const AWARD_CONFIGS: AwardConfig[] = [OSCAR_CONFIG, GOLDEN_GLOBES_CONFIG, CANNES_CONFIG];

export const findAwardConfig = (slug: string | undefined): AwardConfig | null =>
  AWARD_CONFIGS.find((config) => config.slug === slug) ?? null;
