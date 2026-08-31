// src/pages/private/franchise/franchiseConfigs.ts
// As 9 franquias do dropdown "Franquias" da nav — pedido explícito da
// Rebecca: "outro item na nav o menu de franquias tb vai virar um
// dropdown: Marvel (filmes da marvel e séries), DC, Mundo Mágico
// (universo Harry Potter), Terra Média, Star Wars, Jornada nas estrelas,
// Jurassic Park, Percy Jackson, James Bond". Confirmado (AskUserQuestion)
// como "Timeline única por franquia" — cada uma vira UMA timeline
// auto-criada (na primeira visita) usando o MESMO motor de busca do
// painel "criar timeline" (resolveTimelineMovies,
// home/dashboard/functions.ts), exibida numa grade simples com toggle
// "já vi" (reaproveitando o padrão visual de TimelineDetail), NÃO uma
// página de descoberta bespoke por franquia (hero/trailer/streaming não
// fazem sentido pra uma página escopada a uma franquia só).
//
// `collectionName` — pedido explícito da Rebecca, um dia depois de ver a
// página funcionando: "vc seguiu a mesma lógica do oscar? ... salvar os
// dados numa collection única e atrelar com os dados os filme para não
// ficar usando a ia toda hora?" — a resposta era NÃO até esse pedido (a
// resolução por IA acontecia de novo pra cada usuário que visitasse uma
// franquia pela 1ª vez). Agora, igual Oscar/Globo de Ouro/Cannes
// (pages/private/awards), cada franquia tem sua PRÓPRIA collection global
// no Firestore (read público, write autenticado — mesmas
// firestore.rules) — resolvida por IA (`resolveTimelineMovies`) só na
// PRIMEIRA vez que QUALQUER usuário visita, entre TODOS os usuários do
// app; toda visita seguinte, de qualquer um, só LÊ o catálogo já salvo
// (ver `functions.ts` deste módulo). Diferente de Oscar (cadastro 100%
// MANUAL, zero IA dentro do app — decisão tomada por causa de custo real
// alto testando o Oscar com IA), aqui a IA continua rodando dentro do
// app, só que UMA VEZ só por franquia (9 chamadas no total, pra sempre),
// não uma por usuário — o pedido da Rebecca foi especificamente "não
// ficar usando a ia toda hora", não "nunca usar IA".
export interface FranchiseConfig {
  slug: string; // usado na rota (/franquias/:slug) e em Timeline.franchiseSlug
  name: string; // rótulo curto (nav, título da página)
  // Collection global do Firestore com o catálogo já resolvido dessa
  // franquia (doc único, id fixo — ver FRANCHISE_CATALOG_DOC_ID em
  // functions.ts). Nome em camelCase, mesmo padrão de
  // AwardConfig.collectionName (globoDeOuro).
  collectionName: string;
  // Descrição livre passada pra resolveTimelineMovies — o MESMO motor
  // (pessoa/franquia/premiação/busca por IA) que já resolve o painel
  // "criar timeline" da Home/Séries/Animes. Pede explicitamente "filmes
  // e séries" pra cobrir as duas coisas (ver index.tsx,
  // `skipCollectionAxis: true` — sem isso o eixo `/collection` do TMDb,
  // que só modela FILME, "ganharia" primeiro e a franquia ficaria sem a
  // parte de série). Só é usada quando o catálogo global ainda não
  // existe (ver comentário de `collectionName` acima).
  query: string;
}

export const FRANCHISE_CONFIGS: FranchiseConfig[] = [
  {
    slug: "marvel",
    name: "Marvel",
    collectionName: "marvel",
    query: "todos os filmes e séries do Universo Cinematográfico Marvel (MCU), da Fase 1 até hoje",
  },
  { slug: "dc", name: "DC", collectionName: "dc", query: "todos os filmes e séries do universo DC (DC Extended Universe e o novo DC Universe)" },
  {
    slug: "mundo-magico",
    name: "Mundo Mágico",
    collectionName: "mundoMagico",
    query: "todos os filmes e séries do universo mágico de Harry Potter, incluindo a saga original e os filmes de Animais Fantásticos",
  },
  {
    slug: "terra-media",
    name: "Terra Média",
    collectionName: "terraMedia",
    query:
      "todos os filmes e séries ambientados na Terra-média criada por J.R.R. Tolkien, incluindo O Senhor dos Anéis, O Hobbit e Os Anéis de Poder",
  },
  {
    slug: "star-wars",
    name: "Star Wars",
    collectionName: "starWars",
    query: "todos os filmes e séries da franquia Star Wars, incluindo as trilogias principais, os spin-offs e as séries do Disney+",
  },
  {
    slug: "jornada-nas-estrelas",
    name: "Jornada nas Estrelas",
    collectionName: "jornadaNasEstrelas",
    query: "todos os filmes e séries da franquia Star Trek (Jornada nas Estrelas), incluindo as séries clássicas e as produções recentes",
  },
  {
    slug: "jurassic-park",
    name: "Jurassic Park",
    collectionName: "jurassicPark",
    query: "todos os filmes e séries da franquia Jurassic Park / Jurassic World",
  },
  {
    slug: "percy-jackson",
    name: "Percy Jackson",
    collectionName: "percyJackson",
    query: "todos os filmes e séries baseados nos livros de Percy Jackson, de Rick Riordan",
  },
  { slug: "james-bond", name: "James Bond", collectionName: "jamesBond", query: "todos os filmes da franquia James Bond (007)" },
];

export const findFranchiseConfig = (slug: string | undefined): FranchiseConfig | null =>
  FRANCHISE_CONFIGS.find((config) => config.slug === slug) ?? null;
