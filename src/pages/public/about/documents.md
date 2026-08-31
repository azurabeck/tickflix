# About (`/sobre`)

Landing page pública explicando a proposta do TickFlix e como criar uma
timeline — sem dado dinâmico nenhum (sem chamada ao TMDb/Gemini/Firestore),
só conteúdo estático (`functions.ts`: `FEATURES`, `STEPS`,
`EXAMPLE_PROMPTS`) pra carregar rápido e nunca quebrar por API fora do ar.

Acessada pelo link "saiba mais aqui" no estado vazio de "Minhas timelines"
do [Dashboard](../../private/home/dashboard/documents.md), mas funciona
solta também (`ROUTES.ABOUT = "/sobre"`, registrada em `App.tsx` **sem**
gate de autenticação — ao contrário de `ROUTES.HOME`, dá pra abrir logado
ou deslogado). "Voltar"/CTAs apontam pra `ROUTES.HOME`; o próprio
`App.tsx` resolve certo dos dois jeitos (Dashboard se logado, redireciona
pro login se não).

## Seções

1. **Nav** — logo + "Voltar".
2. **Hero** (fundo gradiente roxo escuro, mesmo do
   `.dashboard__timelines`) — título, tagline (`APP_TAGLINE`), texto de
   proposta, CTA "Começar agora".
3. **"O que dá pra fazer aqui"** — grade de 4 cards (`FEATURES`): criar
   por descrição, marcar "já vi", em cartaz/bilheteria, detalhes
   completos do título.
4. **"Como criar uma timeline"** (fundo escuro de novo) — 4 passos
   (`STEPS`) explicando o fluxo real (sem wizard, um input só) + chips
   com exemplos reais de descrição (`EXAMPLE_PROMPTS`).
5. **CTA final** — faixa sólida `$color-primary`, botão "Ir pro
   TickFlix".
6. **Rodapé** — logo + tagline.
