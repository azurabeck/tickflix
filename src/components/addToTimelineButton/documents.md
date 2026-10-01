# AddToTimelineButton

Botão GLOBAL ("adicionar a uma timeline") — pedido explícito da Rebecca:
"o simbolo de claquete troca pra um simbolo de player.. e o simbolo de
claquete passa ser pra adicionar a uma time, quando clica abre um menu
com adicionar a timeline existe ou criar nova timeline". A claquete
(ícone `Clapperboard`) deixou de significar "disponível em streaming" —
esse papel passou pro `Play` em `@/components/availabilityBadge` — e
virou essa ação nova. Mesmo padrão de peça global que `WatchButton`/
`AvailabilityBadge` já seguem: quem usa só passa `uid` + o filme/série do
card (`AddableMovie`, `functions.ts`), sem saber nada do que acontece
dentro.

## Posição — canto INFERIOR ESQUERDO, sempre

Pergunta feita direto à Rebecca (o pôster já tinha `WatchButton`/botão
primário no topo-direito e o `Play` de disponibilidade no topo-esquerdo
por padrão) — escolha explícita dela: "Canto inferior esquerdo". Fica
SEMPRE nesse canto em qualquer tela do site, nunca muda. Onde esse canto
já tinha o `Play` de disponibilidade por colisão de layout (Séries/
Animes com o selo de ranking, Awards com o badge "Vencedor" — ambos no
topo-esquerdo, empurrando o `Play` pro canto de baixo) o `Play` foi
reposicionado pro INFERIOR DIREITO nessas páginas (não o inferior
esquerdo) — exatamente pra abrir espaço fixo pra esse botão aqui (ver
`series/styles.scss` e `awards/styles.scss`, `.availability-badge`).

## O menu — duas opções

Clicar no ícone abre um menu pequeno (`add-to-timeline__menu`, fecha ao
clicar fora — mesmo padrão `mousedown`+`useRef` já usado pelos dropdowns
da nav, `@/components/appNav`):

1. **Adicionar a timeline existente** (`ExistingTimelineModal.tsx`) —
   lista TODAS as timelines do usuário (`fetchTimelines`, sem filtro por
   categoria — mesma simplicidade que a timeline de franquia já aceita,
   que mistura filme/série numa só). Clicar numa timeline resolve o
   `TimelineMovie` completo (`toTimelineMovie`, ver abaixo) e grava via
   `updateTimelineMovies` (já existia em `service/TimelineSettings.ts`,
   usada até aqui só pelo `AddDataModal` de premiação). Já estava nessa
   timeline → não duplica, só confirma visualmente ("Adicionado ✓").

2. **Criar nova timeline** (`CreateTimelineModal.tsx`) — pedido original
   da Rebecca, antes de qualquer menu: "EU QUERO PODER CRIAR UMA TIMELINE
   MANUALMENTE TB". Diferente do painel de IA por descrição
   (`CreateTimelinePanel`/`CreateTimelineModal` de
   `home/dashboard` — texto livre, a IA decide os títulos), aqui é 100%
   manual: campo de NOME + barra de busca (`searchTmdbMulti`,
   `service/TMDbSettings.ts` — mesma ideia de `/search/multi` que
   `@/components/searchModal` já usa, mas com `year` resolvido junto,
   que `TimelineMovie` exige e `DashboardMovie` não guarda) + grade dos
   selecionados (com botão de remover cada um) + botão "Salvar". Abre já
   com o filme/série de ORIGEM (o pôster cuja claquete foi clicada)
   pré-adicionado — "criar nova timeline" a partir de um card não devia
   começar vazia. `createTimeline(uid, nome, types, movies, {followed:
   true})` — mesmo `followed: true` do painel de IA (timeline nova já
   aparece direto na Home).

## `year` resolvido tarde, não guardado em todo card

`TimelineMovie` (`service/TimelineSettings.ts`) exige `year: string`,
mas a maioria dos cards do site (`MovieRowItem`, `DashboardMovie`,
`AwardNominee`...) só guarda id/mediaType/título/pôster — nunca ano.
`toTimelineMovie` (`functions.ts`) resolve isso com UMA chamada a mais
(`fetchTitleById`, estendida pra devolver `year` também — antes só
título/pôster) só na hora de adicionar de VERDADE (clique em "existente"
ou no filme de origem do "criar nova"), não em toda renderização do
botão — barato e raro, não um custo por fileira inteira. Resultado de
busca (`searchTmdbMulti`) já vem com `year` certo, não precisa dessa
resolução extra.

## `types` da timeline manual — reflete o que foi adicionado

Mistura filme e série é permitida (mesma ideia já aceita pela timeline de
franquia, `pages/private/franchise`) — `typesFromMovies` (`functions.ts`)
calcula `["filmes"]`/`["series"]`/`["filmes","series"]` a partir do que
está na grade de selecionados, não um valor fixo.

## Sem tmdbId — Awards é o único caso

Indicado de premiação sem `tmdbId` cadastrado (`AwardNominee.tmdbId:
number | null`) não tem como virar um `TimelineMovie` de verdade — o
botão simplesmente não é renderizado pra esses (`EditionDetail.tsx`,
`NomineeCard`), mesmo tratamento que o `MovieDetail` já dá pro clique
num indicado assim.
