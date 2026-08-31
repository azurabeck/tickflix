// src/service/Routes.ts
// Fonte unica de rotas da aplicacao — App.tsx le ROUTES pra montar o
// <Routes> do router em vez de espalhar strings de path pelo app.

export const ROUTES = {
  AUTH: "/login",
  HOME: "/",
  SERIES: "/series",
  ANIMES: "/animes",
  OSCAR: "/oscar",
  // Nav "Oscar" virou dropdown com 3 premiações — pedido explícito da
  // Rebecca: "agora na nav o menu oscar tb vai virar um dropdown: Oscar,
  // Globo de Ouro, Vestival de Canes [Festival de Cannes]". As 3 rotas
  // renderizam o MESMO componente genérico (pages/private/awards), só
  // com uma AwardConfig diferente (ver awards/awardConfigs.ts).
  GOLDEN_GLOBES: "/globo-de-ouro",
  CANNES: "/festival-de-cannes",
  TIMELINES: "/timelines",
  // Base do dropdown "Franquias" — pedido explícito da Rebecca: "outro
  // item na nav o menu de franquias tb vai virar um dropdown" (Marvel,
  // DC, Mundo Mágico, Terra Média, Star Wars, Jornada nas Estrelas,
  // Jurassic Park, Percy Jackson, James Bond — 9 franquias, ver
  // pages/private/franchise/franchiseConfigs.ts). Rota DINÂMICA
  // (`/franquias/:slug` em app.tsx) — primeira do app; 9 páginas quase
  // idênticas (só o conteúdo muda) tornam 9 rotas fixas mais frágil e
  // repetitivo do que uma rota parametrizada com uma lista de config.
  FRANCHISES: "/franquias",
  // Landing page pública explicando a proposta do site e como criar uma
  // timeline — acessível logado ou não (link "saiba mais" no estado vazio
  // do Dashboard), por isso não é gated por auth em App.tsx como HOME é.
  ABOUT: "/sobre",
} as const;

export type RouteKey = keyof typeof ROUTES;
