# AvailabilityBadge

Selo GLOBAL de "disponível pra ver em streaming ou aluguel" — ícone
`Clapperboard`, canto SUPERIOR ESQUERDO de qualquer pôster, por padrão.
Extraído da fileira "Principais lançamentos" (`@/pages/private/home/dashboard`,
ver `documents.md` de lá pro histórico original) — pedido explícito da
Rebecca: "a claquete dizendo se o filme ta disponível em streaming ou
aluguel, deve aparecer em todos os lugares do site, pode virar um padrão
do componente global de details".

Mesmo padrão de `@/components/watchButton`: componente burro, só recebe
`available: boolean` e desenha o selo (ou `null` quando `false` — nunca
ocupa espaço/DOM quando não disponível). Quem chama decide COMO resolver
esse booleano.

## Resolvedor — `fetchAvailabilityMap` (`@/components/movieDetail/functions.ts`)

Vive junto do `fetchWatchProviders` que ele reaproveita (mesma chamada
`/watch/providers` do TMDb que já resolve "onde assistir" no modal de
detalhes — nenhuma duplicação de rede). Recebe uma lista de
`{id, mediaType}` + código do país, devolve um `Map<string, true>`
chaveado por `movieKey(mediaType, id)` (`service/TimelineSettings.ts`,
mesmo formato de chave do `watchedMap`) — só entram no Map os que TÊM
`flatrate` (assinatura) ou `rent` (aluguel); `buy` (compra avulsa) não
conta, mesma regra desde a fileira original. Falha ao resolver um item
não derruba os outros (`Promise.all` com `try/catch` por item, não
`Promise.allSettled` — aqui cada item já devolve `null` em vez de
rejeitar).

`Map<string, true>` (não `Set`) só pra espelhar o mesmo padrão de
"presença = true" já usado por `watchedMap`/outras partes do app — mais
fácil de ler em conjunto (`new Map([...a, ...b])` pra mesclar, etc.).

## Quem chama, e como cada um resolve o próprio Map

Não existe cache cross-page — cada tela que mostra pôster resolve sua
PRÓPRIA disponibilidade, mesma filosofia descentralizada já usada pelo
resto do app (`watchedMap` também é assim).

- **Home** (`dashboard/index.tsx`) — `availabilityMap` compartilhado
  entre as 3 fileiras genéricas (últimos vistos/em cartaz/bilheteria),
  mesclado (`mergeAvailability`) depois de cada uma resolver sua própria
  lista. A fileira de lançamentos (`MajorReleasesModal`/`MovieRow` da
  Home) tem resolução PRÓPRIA desde a origem (já busca `available` junto
  da data de estreia em `fetchRecentMajorReleases`) — só converte pro
  mesmo formato de Map na hora de passar pro `MovieRow.tsx`.
- **Séries/Animes** (`pages/private/series`, `pages/private/anime`) —
  Map próprio por página (mediaType fixo `"tv"`), mesclado a cada fileira
  de provedor + "top do ano" resolvida.
- **TimelineDetail/Franchise/Awards (`EditionDetail`)/SearchModal** —
  self-contained: cada um resolve o próprio Map num `useEffect` (keyed na
  lista de filmes/categorias/resultados que já tem em mãos), sem receber
  isso via prop de quem abre — mesmo raciocínio já documentado em
  `TimelineDetail.tsx`: esses componentes abrem a partir de múltiplas
  telas diferentes, threadar um Map por todas elas seria mais código pra
  manter do que resolver uma vez aqui dentro.
  - Awards é o único caso com indicado SEM `tmdbId` cadastrado possível
    (`AwardNominee.tmdbId: number | null`) — só entram no `fetchAvailabilityMap`
    os que têm `tmdbId` real; os demais nunca aparecem no Map resultante
    (claquete sempre `false` pra eles, sem chamada desperdiçada).

## Colisão de canto — top-left já ocupado em algumas telas

O badge nasce sempre top-left. Duas telas já tinham outro selo ali:

- **Séries/Animes** — `__row-rank` ("Nº" da posição no "top do ano").
- **Awards** — `__nominee-winner-badge` ("Vencedor", só no indicado
  vencedor).

Resolvido com override de CSS local em cada página/seção
(`.series-page__row-item .availability-badge` /
`.awards__nominee .availability-badge` → `top: auto; bottom: 8px; left:
8px;`), não mudando o padrão do componente — outras telas (Home,
Timelines, Franchise, Search) não têm esse conflito e usam o padrão.
