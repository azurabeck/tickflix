# Awards (Oscar / Globo de Ouro / Cannes)

Generalização de `pages/private/oscar` (pasta antiga, deletada) — pedido
explícito da Rebecca: "agora na nav o menu oscar tb vai virar um
dropdown: Oscar // a pagina de oscar que já criamos, Globo de Ouro,
Vestival de Canes [sic, Festival de Cannes]", confirmado via
`AskUserQuestion` como **"Mesma estrutura da Oscar, parametrizada"** — um
componente genérico "Awards" reusado 3x, só trocando o nome do prêmio e
as categorias reais de cada um.

`AwardConfig` (`awardConfigs.ts`) é o único lugar que muda entre os três:
`slug` (rota/`Timeline.awardSlug`), `name`, `collectionName` (Firestore),
`firstYear`/`lastYear` (grade de edições), `editionNoun` ("cerimônia do
Oscar" vs "edição do Festival de Cannes"), `filmYearOffset` (Oscar/Globo
de Ouro premiam os filmes do ANO ANTERIOR à cerimônia; Cannes premia
filmes exibidos NO PRÓPRIO ano do festival — por isso 1 vs 0),
`bestCategoryName` (categoria usada pro headline do card — "Melhor
Filme" no Oscar, "Melhor Filme - Drama" no Globo de Ouro que tem duas
categorias de melhor filme, "Palma de Ouro" em Cannes) e `accentColor`
(cor de destaque da página, ver seção de estilo abaixo). O resto do
módulo (`functions.ts`, `EditionGrid`/`EditionDetail`/`AddDataModal`,
`timelineSync.ts`, `index.tsx`) é 100% genérico — nenhum `if (slug ===
"oscar")` espalhado por aí. As 3 rotas (`ROUTES.OSCAR`/`GOLDEN_GLOBES`/
`CANNES`, `app.tsx`) renderizam o MESMO `<AwardPage config={...} />`.

Números de `firstYear`/`filmYearOffset`/`bestCategoryName` do Globo de
Ouro e Cannes são uma aproximação razoável (1 edição por ano, sem os
hiatos reais que Cannes teve historicamente por exemplo) — a Rebecca
cadastra o dado de verdade manualmente (ver seção abaixo), então um
ordinal levemente errado no card da grade não afeta o conteúdo
cadastrado, só a numeração decorativa do card. A quirk do Oscar (1ª
edição cobria "1927/28", dois anos) não foi replicada — agora toda
edição mostra um ano só; perda cosmética aceita pra manter a config
simples.

## Dado — 100% Firestore, cadastro MANUAL (sem IA) — igual já era pro Oscar

Continua valendo (e vale ainda mais agora, com 3 premiações em vez de 1)
a decisão já tomada só pro Oscar: **zero chamada de IA de dentro do
app**. A resolução por IA dentro do app existiu uma vez (removida 21/08)
até a Rebecca relatar custo real alto testando (R$200+, "ou a gente ta
gastando mt processamento no token ou ta mt caro mesmo") e pedir pra
trocar por cadastro manual. O botão "Adicionar dados"/"Editar dados"
(`EditionDetail.tsx`) abre `AddDataModal.tsx`: "Copiar prompt de
pesquisa" (`buildResearchPrompt`, parametrizado por `config`+`edition` —
nome do prêmio, categoria principal, ano) copia um prompt pronto pra uma
IA EXTERNA (ChatGPT/Claude/Gemini web, conta da Rebecca) pesquisar cada
filme no TMDb e responder só o JSON no formato esperado. Ela cola a
resposta → `parseAwardCategoriesJson` valida a FORMA (não o conteúdo) →
`saveAwardEditionData` calcula o `headline` (vencedor de
`config.bestCategoryName`, com fallback pro vencedor da 1ª categoria
cadastrada) e grava em `{config.collectionName}/{ordinal}`.

Cada premiação tem sua PRÓPRIA collection no Firestore
(`AwardConfig.collectionName`): `oscar` (nome mantido — é a collection
real já em uso em produção, não podia mudar de nome sem perder o dado já
cadastrado), `globoDeOuro`, `cannes`. Regras espelhadas em
`firestore.rules` (read público, write autenticado — sem conceito de
admin ainda).

**A GRADE de edições já mostra o vencedor de quem já foi cadastrado, sem
precisar clicar** — `fetchAllSavedAwardEditions` (leitura em lote da
collection inteira) roda no mount de `index.tsx`, refeita a cada troca de
`config` (useEffect com `[config]` — trocar de Oscar pra Globo de Ouro é
o MESMO componente React montado, não desmonta/remonta sozinho, então o
efeito precisa reagir à mudança de config explicitamente, senão o Globo
de Ouro abriria mostrando a grade do Oscar).

## Detalhe do indicado — MESMO modal global de todo o app

Sem mudança na generalização: clicar num indicado abre
`<MovieDetail id={} mediaType={} />` (`@/components/movieDetail`), o
MESMO componente usado em timeline/últimos vistos/em cartaz/busca em todo
o app. Indicado sem `tmdbId` cadastrado cai num painel de aviso simples
reaproveitando o chrome do modal global (`movie-detail__overlay/__panel`).

## "Já vi esse filme" — estado GLOBAL, compartilhado com as timelines

Sem mudança: `users/{uid}/watched/{chave}` (`service/WatchedSettings.ts`),
`awardNomineeKey` (mesma ideia de `oscarNomineeKey` antes, generalizada)
usa a MESMA chave de `timelineMovieKey` quando o indicado tem `tmdbId`
real.

## Marcar "já vi" também gera uma timeline de verdade — por PRÊMIO+edição

`timelineSync.ts` (`syncAwardTimeline`) generaliza o que só existia pro
Oscar: cria/garante uma `Timeline` chamada "{ordinal}ª {editionNoun}"
com todos os indicados únicos daquela edição. `Timeline.awardSlug` +
`Timeline.awardEditionOrdinal` (`service/TimelineSettings.ts`) juntos
acham "já existe uma timeline pra essa edição DESSE prêmio?"
(`fetchTimelineByAwardEdition`) — precisa dos DOIS campos porque a
edição 81 do Oscar e a edição 81 do Globo de Ouro não podem colidir numa
busca só por ordinal. **Campo renomeado**: antes era só
`oscarEditionOrdinal` (só existia o Oscar); dado de teste antigo da
Rebecca com esse campo velho simplesmente não casa mais com a busca nova
— sem problema real, ela é a única usuária testando ainda, marcar "já
vi" de novo só cria uma timeline nova em vez de reaproveitar a antiga,
"já vi" em si (estado global) não é afetado.

## Estilo — cor de destaque por premiação

Antes era um dourado (`$gold`) fixo no SCSS (só existia o Oscar). Agora
`--awards-accent` é uma CSS custom property, setada inline por
`index.tsx` a partir de `config.accentColor` (Oscar dourado `#d4af37`,
Globo de Ouro azul `#4a7fd6`, Cannes vermelho `#c81d3f`) — cada premiação
ganha identidade visual própria sem precisar de 3 cópias do SCSS. Onde
antes tinha `rgba($gold, X)` (opacidade fixa em cima de uma cor
compile-time), agora usa `color-mix(in srgb, var(--awards-accent) X%,
transparent)` — `rgba()` do Sass não sabe aplicar opacidade em cima de
uma CSS custom property (é runtime, não compile-time); `color-mix()` é
CSS de verdade, resolvido no navegador.
