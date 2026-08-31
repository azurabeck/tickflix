# Franchise (Marvel / DC / Mundo Mágico / Terra Média / Star Wars / Jornada nas Estrelas / Jurassic Park / Percy Jackson / James Bond)

Pedido explícito da Rebecca: "outro item na nav o menu de franquias tb
vai virar um dropdown: Marvel // vamos fazer uma pagina listando os
filmes da marvel e séries, DC..., Mundo Mágico // universo harry
potter..." — 9 franquias. Confirmado via `AskUserQuestion` como
**"Timeline única por franquia"**: cada uma vira UMA `Timeline` de
verdade do usuário (não uma página de descoberta bespoke com hero/
trailer/streaming — isso não faz sentido escopado a uma franquia só),
resolvida uma vez com o MESMO motor de busca que já existe (o painel
"criar timeline" da Home/Séries/Animes,
`home/dashboard/functions.ts#resolveTimelineMovies`), exibida numa grade
simples com toggle "já vi".

## Rota dinâmica — primeira do app

`/franquias/:slug` (`app.tsx`) é a PRIMEIRA rota parametrizada do app —
até aqui `ROUTES` só tinha strings fixas (uma constante por página). 9
páginas quase idênticas (só o conteúdo muda) tornariam 9 rotas fixas +
9 entradas de config repetitivo e frágil (fácil esquecer de atualizar um
lugar ao adicionar/remover franquia) — uma rota parametrizada +
`FRANCHISE_CONFIGS` (`franchiseConfigs.ts`, um array com `slug`/`name`/
`query`) é a mesma decisão que o resto do app já toma pra listas
parecidas (`AWARD_CONFIGS`, `TIMELINE_CATEGORIES`).

`findFranchiseConfig(slug)` sem match (slug incorreto/removido) redireciona
pra Home (`<Navigate to={ROUTES.HOME} />`) em vez de mostrar página de
erro — mesmo padrão de fallback silencioso que "*" já usa em `app.tsx`.

## Resolução — mesmo motor de "criar timeline", com um ajuste

`resolveTimelineMovies` (`home/dashboard/functions.ts`) já existia e já
cobria "franquia" como um dos eixos determinísticos (`collectionQuery` →
`/collection` do TMDb) — MAS esse eixo só modela FILME
(`resolveCollectionMovies` sempre grava `mediaType: "movie"`). Como o
pedido da Rebecca é explicitamente "filmes E séries" por franquia
(Marvel/Star Wars/Percy Jackson têm spin-off de série de verdade), deixar
esse eixo "ganhar" primeiro (ele teria prioridade sobre o eixo de busca
por IA, que cobre os dois) deixaria a timeline sem a parte de série
nenhuma.

Correção: `resolveTimelineMovies` ganhou um 3º parâmetro opcional,
`options: { skipCollectionAxis?: boolean }` (aditivo — os outros
chamadores, painéis de criar timeline da Home/Séries/Animes, não passam
isso, comportamento deles não muda). As páginas de franquia chamam com
`skipCollectionAxis: true`, forçando o fluxo direto pro eixo de busca por
IA com Google Search grounding (`resolveByAiSearch`) — que já lida bem
com "filmes e séries misturados" (mesma lógica que já cobre temas gerais
tipo "anime", só que agora aplicada a franquia também).

## Duas camadas de cache — catálogo GLOBAL + timeline por usuário

Pedido explícito da Rebecca, um dia depois de testar a página: "vc
seguiu a mesma lógica do oscar? ... salvar os dados numa collection
única e atrelar com os dados os filme para não ficar usando a ia toda
hora? se não vamos fazer isso agora." A resposta era NÃO até esse pedido
— a versão anterior só cacheava por USUÁRIO (`fetchTimelineByFranchise`)
, então um segundo usuário (ou uma segunda conta) visitando "Marvel"
pela 1ª vez pagava IA+TMDb de novo, do zero, mesmo a franquia já tendo
sido resolvida antes por outra pessoa.

Agora são DUAS camadas, na ordem em que `index.tsx` tenta:
1. **Timeline do próprio usuário** (`fetchTimelineByFranchise(uid,
   slug)`, `service/TimelineSettings.ts`) — se essa pessoa já visitou
   essa franquia antes, usa direto (cobre também o progresso/"já vi"
   dela, que vive nessa timeline).
2. **Catálogo GLOBAL** (`fetchFranchiseCatalog(config)`, `functions.ts`
   deste módulo — collection própria por franquia, `marvel`/`dc`/etc.,
   `FranchiseConfig.collectionName`) — compartilhado por TODOS os
   usuários. Se ALGUÉM (qualquer usuário) já resolveu essa franquia
   antes, o catálogo já existe: usa os filmes de lá pra criar a timeline
   DESSE usuário (`createFranchiseTimeline`), **sem chamar IA de novo**.
3. Só se NEM UM nem outro existir (a franquia nunca foi visitada por
   ninguém ainda) é que resolve via IA+TMDb (`resolveTimelineMovies`) —
   e grava nos DOIS lugares: o catálogo global (`saveFranchiseCatalog`,
   pra nenhum usuário futuro pagar IA de novo por essa franquia) e a
   timeline deste usuário.

Resultado: a IA roda, no MÁXIMO, uma vez por franquia — 9 vezes no
total, pra sempre, não uma vez por usuário.

**Self-heal pro caso de timeline já existente sem catálogo** —
`index.tsx`: quando o passo 1 (timeline do próprio usuário) já satisfaz
(usuário que visitou aquela franquia ANTES do catálogo global existir),
verifica em paralelo (best-effort, não bloqueia a UI) se o catálogo
global já existe; se não, grava a partir dos filmes que essa timeline JÁ
tem — sem chamar IA de novo, só "doando" o resultado já resolvido pro
catálogo compartilhado. Sem isso, uma franquia visitada só por usuários
que JÁ tinham timeline própria (ex.: as 4 testadas antes desse pedido —
Marvel, DC, Mundo Mágico, Percy Jackson) nunca ganharia catálogo global
sozinha, porque o passo 1 sempre satisfaz primeiro e o bloco que grava o
catálogo (passo 3) nunca seria alcançado. Mesma ideia de
`pages/private/awards` (collection própria por premiação, dado
compartilhado) — só que lá o cadastro é 100% MANUAL (zero IA dentro do
app, decisão tomada por causa de custo real alto testando o Oscar com
IA há mais tempo); aqui a IA continua rodando dentro do app, só que
UMA VEZ só por franquia — o pedido da Rebecca foi especificamente "não
ficar usando a ia toda hora", não "nunca usar IA". `firestore.rules`
ganhou 9 blocos novos (`marvel`, `dc`, `mundoMagico`, `terraMedia`,
`starWars`, `jornadaNasEstrelas`, `jurassicPark`, `percyJackson`,
`jamesBond`) — read público, write autenticado, mesmo padrão das 3
premiações.

**Bug real, visto ao vivo testando esta página**: a timeline de franquia
usa um **ID DETERMINÍSTICO** (`franchise-{slug}`, `getDoc`/`setDoc`
diretos), NÃO o padrão "buscar por query onde `franchiseSlug == X`, se
não achar, `addDoc` com auto-id" que as premiações usam
(`fetchTimelineByAwardEdition`/`createTimeline`). Motivo: a resolução
leva 10s+ (IA+TMDb) e acontece automaticamente no MOUNT da página — dois
efeitos concorrentes (React StrictMode já double-invoca o efeito sozinho
em dev; duas abas na mesma franquia antes da 1ª terminar de resolver, em
produção) buscam ANTES de qualquer um ter gravado, os dois acham "não
existe" e os dois criam — resultado visto ao vivo: 2 cards "Percy
Jackson" na grade de Timelines, timelines duplicadas de verdade. Com ID
determinístico (`franchiseTimelineId`, `service/TimelineSettings.ts`),
os dois `setDoc` concorrentes escrevem no MESMO documento — o pior caso
vira "resolveu duas vezes à toa" (custo de IA desperdiçado), nunca dois
documentos. As premiações não sofrem desse bug porque lá a
criação/gravação só acontece a partir de um CLIQUE do usuário ("já vi"),
não automaticamente no mount — dificilmente dois cliques concorrentes na
mesma edição inexistente antes de qualquer um terminar de gravar.

`types: ["filmes", "series"]` fixo na criação (não
`[categoryLock ?? "filmes"]` como o resto do app calcula) — franquia é
sempre mista por definição aqui; isso também significa que, se a Rebecca
seguir (estrela ⭐, página Timelines) uma timeline de franquia, ela
aparece tanto na fileira "Timelines que você segue" da Home (Filmes)
quanto na da página Séries — correto, ela pertence às duas de verdade.
Timeline de franquia nasce **não-seguida** por padrão (efeito colateral
de visitar a página, não uma criação deliberada — mesma regra já usada
pras timelines auto-criadas de premiação).

## Visual — reaproveita a grade de `TimelineDetail`, sem o modal por cima

A grade de pôsteres + `WatchButton` + `MovieDetail` aninhado ao clicar é
literalmente o mesmo padrão de
`pages/private/timelines/TimelineDetail.tsx` — mas como PÁGINA cheia, não
dialog: uma página de franquia já É o "detalhe", não precisa de mais um
nível de modal por cima dela. Em vez de duplicar o CSS de grade/pôster,
`index.tsx` importa `pages/private/timelines/styles.scss` e reusa as
classes `timelines-page__movie-*` direto — mesma filosofia de reuso já
estabelecida entre Séries/Animes (Animes literalmente usa classes
`series-page__*`). Só o fundo/cabeçalho da página (`franchise-page__*`)
tem CSS próprio (`styles.scss` deste módulo).
