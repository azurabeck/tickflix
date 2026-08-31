# Timelines

Página própria (rota `/timelines`) pra "Minhas timelines" — antes vivia
dentro da Home, extraída de lá quando a nav virou global (Home/Oscar/
Timelines). Fundo full-bleed com o mesmo gradiente roxo escuro de
`.dashboard__timelines` antes.

Grade de cards vinda do Firestore (`fetchTimelines`,
`service/TimelineSettings.ts`), FILTRADA por categoria
(`?category=filmes|series|animes` na URL, ver seção "Categorização"
abaixo pra como isso chega aqui) — as abas Filmes/Séries/Animes de
dentro da página morreram faz tempo, mas voltaram como dropdown na nav
global (`@/components/appNav`). Cada card ("embelezado" a pedido da
Rebecca): colagem
com até 4 pôsteres dos primeiros filmes da timeline no topo (placeholder
com ícone de claquete quando não tem nenhum), sombra escura por trás pra
legibilidade, nome + barra de progresso (`timelineProgress` +
`progressPercent`, ambos em `service/TimelineSettings.ts` — genéricos o
bastante pra não pertencer só a uma página) embaixo.

Duas ações no canto superior direito, sobre a colagem de pôsteres:
- **Estrela** (`Star`, outline/sólido) — "seguir" a timeline
  (`setTimelineFollowed`, campo `Timeline.followed`). Timeline seguida
  passa a aparecer também na Home, numa fileira própria ("Timelines que
  você segue", `home/dashboard/index.tsx`) que abre o MESMO
  `TimelineDetail` de lá — por isso `TimelineDetail.tsx` importa o
  próprio `styles.scss` agora (antes só `index.tsx` importava; a Home
  não tinha esse CSS carregado).
- **Lixeira** — apagar (`deleteTimeline`, com `window.confirm`).

**Toda timeline criada pelo painel "Criar uma nova timeline" já nasce
seguida** (`createTimeline(..., followed: true)`, `CreateTimelineModal.tsx`
e `createTimelineFromDescription` em `home/dashboard/functions.ts`) —
pedido explícito da Rebecca: "quando adicionar um timeline nova já
adiciona ela como favorita". Aparece na Home sem precisar ir clicar na
estrela depois. A timeline auto-criada pela página Oscar
(`oscar/timelineSync.ts`, uma por edição) fica de FORA dessa regra —
continua não-seguida por padrão (`followed` param omitido, default
`false` em `createTimeline`), já que é efeito colateral de marcar "já
vi", não uma criação deliberada.

Clicar no corpo do card (nome/barra, abaixo da colagem) abre
`TimelineDetail.tsx` — dialog de verdade (overlay, mesmo padrão de
`@/components/movieDetail`), grade de pôsteres com o
`@/components/watchButton` global no canto (ícone de bookmark, mesmo
usado em toda fileira/busca da Home e nos indicados do Oscar). Como
`TimelineDetail` abre `MovieDetail` aninhado (clicar num pôster dentro
dele), fechar o `MovieDetail` (que fecha ao clicar fora) precisa de
`stopPropagation` num wrapper — sem isso borbulhava pro overlay do
`TimelineDetail` e fechava os dois de uma vez.

**"Já vi" é estado GLOBAL por filme, não por timeline** —
`service/WatchedSettings.ts` (`users/{uid}/watched/{chave}`, chave =
`timelineMovieKey`), não mais um campo `watched` gravado dentro do doc
da timeline. Pedido explícito da Rebecca: "a timeline é um agrupamento",
marcar o mesmo filme em duas timelines diferentes é a MESMA marcação —
ver mais em `@/pages/private/oscar/documents.md` (onde isso nasceu,
junto com a timeline auto-criada por edição do Oscar). Essa página
(`index.tsx`) carrega o Map uma vez e passa pra `TimelineDetail`
(watched/progresso) e pra `timelineProgress`/`progressPercent`
(`service/TimelineSettings.ts`) nos cards da grade.

## Categorização (`Timeline.types`)

Começou como "preparar" (pedido da Rebecca, pensando em voz alta sobre
`@/pages/private/series`: "vamos nos preparar para categorizar...
aquelas que estão lá adicionadas agora são da categoria filmes... para
séries vou ter que pensar melhor no que vamos fazer" — decisão inicial
de ADIAR a parte de série), virou categorização DE VERDADE quando a
página Séries ganhou a mesma estrutura inicial da Home (painel "criar
timeline" da página Séries saindo com categoria "series") e, mais pra
frente ainda, quando a página Animes entrou (mesma lógica, categoria
"animes") — e finalmente ganhou UI própria nessa página: "na nav em
timeline, vai virar um menu com dropdown... filmes (exibe a timeline de
filmes), séries (exibe timeline criada para séries), animes (exibe
timeline criadas para anime)".

`Timeline.types: ContentType[]` já existia no schema (sobra do wizard
antigo, campo nunca removido) — hoje tem TRÊS lugares lendo isso:
- A fileira "timelines que você segue" (`FollowedTimelinesRow`, reusada
  pelas três páginas de descoberta) filtra `["filmes"]`/`["series"]`/
  `["animes"]` conforme a página.
- **O dropdown "Timelines" na nav** (`@/components/appNav`) — cada item
  linka pra
  `/timelines?category={filmes|series|animes|franquias|premiacoes}`.
  Essa página (`index.tsx`) lê `category` via `useSearchParams`
  (`parseCategory`, cai em `"filmes"` se ausente/inválido) e filtra antes
  de renderizar a grade — título ("Minhas timelines de {categoria}") e
  estado vazio (link pra página certa de cada categoria) também mudam
  conforme a categoria selecionada.

  **"franquias" — 4ª aba**, pedido explícito da Rebecca ao ver a 1ª
  timeline de franquia (ver pages/private/franchise, `types: ["filmes",
  "series"]` sempre) aparecer na lista: "essas timelines que misturam
  series e filmes ou seja que tem mais de 1 categoria não deve cair na
  categoria outros.. vamos criar a categoria no menu timeline". Junta
  toda timeline com `types.length > 1`.

  **"premiacoes" — 5ª aba**, mesmo pedido, dia seguinte, mesma lógica:
  "pode ter a categoria premiações tb ali... que vai recever as
  timelines do oscar, globo de ouro e vestival de canes". Timeline de
  premiação (ver pages/private/awards/timelineSync.ts) sempre grava
  `types: ["filmes"]` — sem essa aba ela cairia (indevidamente, do ponto
  de vista da Rebecca: "98ª Cerimônia do Oscar" não é a mesma coisa que
  uma timeline "de filme" de verdade) na aba Filmes junto com timeline
  comum. Junta toda timeline com `Timeline.awardSlug` setado — campo só
  presente nas 3 auto-criadas por Oscar/Globo de Ouro/Cannes.

  Por causa dessas duas, o filtro NÃO é mais um `.includes(category)`
  simples pras 3 originais: "filmes"/"series"/"animes" agora exigem
  `types.length === 1` E ausência de `awardSlug` — uma timeline mista ou
  de premiação nunca aparece (também) nelas, só na aba própria. Tipo do
  parâmetro de categoria é `TimelineCategoryFilter`
  (`service/TimelineSettings.ts`) — `ContentType` mais `"franquias"` e
  `"premiacoes"`; nenhuma das duas é um `ContentType` de verdade (nunca
  gravado em `Timeline.types`, são só o RÓTULO desses dois filtros). Nem
  "franquias" nem "premiacoes" têm painel de criação próprio (a timeline
  nasce sozinha ao visitar uma franquia / marcar "já vi" numa premiação),
  então o estado vazio das duas não linka pra "criar", só explica o
  gatilho real.

- **Timelines novas** — `resolveTimelineMovies`
  (`home/dashboard/functions.ts`) recebe um `categoryLock?: ContentType`
  opcional: sem lock (painel da Home) grava `types: ["filmes"]` como
  sempre; `"series"`/`"animes"` (painéis das páginas Séries/Animes)
  forçam `filters.mediaTypes=["tv"]` e pulam o eixo franquia
  (`/collection` do TMDb só modela franquia de FILME); `"animes"`
  ADICIONALMENTE injeta gênero "Animação" + país "JP" nos filtros antes
  de resolver. A timeline auto-criada pela página Oscar
  (`oscar/timelineSync.ts`) já gravava `["filmes"]` fixo desde sempre,
  sem mudança.
- **Timelines antigas** — `fetchTimelines` (`service/TimelineSettings.ts`)
  corrige na leitura: timeline sem `types` NENHUM (doc legado, de antes
  dessa categorização existir) é normalizada pra `["filmes"]`, com
  `updateDoc` de volta pro Firestore (self-healing, não é um script de
  migration à parte) — idempotente, timeline já corrigida não escreve de
  novo na próxima leitura. **Cuidado que já foi bug real**: a primeira
  versão desse backfill normalizava QUALQUER timeline com `types`
  diferente de `["filmes"]` — isso quebraria uma timeline de série de
  verdade (`types: ["series"]`) de volta pra "filmes" sozinha no PRÓXIMO
  fetch, silenciosamente. Corrigido antes de a categoria "series" entrar
  em uso de verdade: agora só doc SEM `types` nenhum é tocado.
