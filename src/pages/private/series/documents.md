# Séries

Página própria (rota `/series`, nav "Séries" entre Home e Oscar —
`@/components/appNav`). Pedido explícito da Rebecca: "vamos fazer a aba
de séries... primeiro a visualização das séries mais vistas de cada
streaming... uma barra de procurar, quando eu adicionar uma série eu
posso marcar quais episódios eu já assisti daquela série." Layout
full-bleed igual à Home (`home/dashboard`): cada seção ocupa 100% da
largura com a própria cor de fundo, só o CONTEÚDO fica limitado por
dentro (`.series-page__inner`, teto de 1440px). Ordem:

0. **Estrutura inicial IGUAL à Home** (pedido explícito da Rebecca depois
   de ver a página pronta: "vamos fazer essa mesma estrutura inicial da
   página de filmes para a página de séries... trailer das séries mais
   populares da atualidade (com mais avaliações) depois a barra para
   criar timeline, e a área de timelines... olho em filmes, é o mesmo só
   que relativo a séries") — três componentes REUSADOS inteiros de
   `@/pages/private/home/dashboard` (mesmo JS, mesmo CSS `dashboard__*`
   já global no bundle — nenhuma cópia, ver `home/dashboard/documents.md`):
   - `HeroCarousel` — trailer, dados de `fetchSeriesHeroTrailers`
     (`functions.ts`), trailer de cada uma via `/tv/{id}/videos`. Fonte
     mudou duas vezes depois de bug relatado ao vivo pela Rebecca (ver
     comentário completo em `fetchTopSeriesOfTheYear`, `functions.ts`):
     1ª versão ponderava por nota sem filtro de ano (trazia trailer de
     série antiga tipo Breaking Bad); 2ª versão usava
     `first_air_date_year={ano atual}` (ano da PRIMEIRA temporada da
     série) — ainda errado, excluía série antiga com temporada NOVA esse
     ano (bug relatado: "cadê Casa do Dragão... se não for do ano de
     lançamento mas tiver temporada nova no ano tem que estar"). Versão
     final usa `air_date.gte`/`air_date.lte` (1º de janeiro a 31 de
     dezembro do ano atual) + `sort_by=vote_count.desc`, sem ponderar
     nota — filtra por QUALQUER episódio de QUALQUER temporada caindo
     nesse intervalo, testado ao vivo com A Casa do Dragão entrando.
     Anime continua fora (mesma exclusão das fileiras de streaming).
   - `CreateTimelinePanel` com `mediaTypeLock="tv"` — resultado da busca
     só série (`resolveTimelineMovies` em `home/dashboard/functions.ts`
     força `filters.mediaTypes=["tv"]`, pula o eixo franquia inteiro —
     `/collection` do TMDb só modela franquia de FILME — e instrui o
     prompt da busca por IA a trazer só série, com filtro de segurança
     depois), timeline criada já sai com `types: ["series"]`.
   - `FollowedTimelinesRow` filtrado por `t.types.includes("series")` —
     a MESMA fileira na Home mostra só `"filmes"`. Resolve de vez a
     categorização que tinha ficado pendente (ver `documents.md` de
     `pages/private/timelines`, "Preparando pra categorização").

   **Corrigido nessa mesma rodada**: `fetchTimelines`
   (`service/TimelineSettings.ts`) tinha um bug real no backfill de
   categoria da rodada anterior — forçava QUALQUER timeline pra
   `["filmes"]` incondicionalmente toda vez que lia, o que quebraria uma
   timeline de série de verdade de volta pra "filmes" sozinha no PRÓXIMO
   fetch. Agora só timeline sem `types` NENHUM (doc legado, de antes da
   categorização existir) é tocada.

1. **Fileiras "Melhor avaliadas na {streaming}"** (`SeriesRow.tsx`, top
   20 — `ROW_LIMIT = 20`, pedido explícito da Rebecca — uma por provedor
   de `STREAMING_PROVIDERS` em `functions.ts`: Netflix, Prime Video,
   Disney+, Max, Globoplay, Apple TV+).

   **Passou por duas correções de critério, as duas reportadas ao vivo
   pela Rebecca:**

   1) Primeira versão usava `sort_by=popularity.desc` (mesma ideia de
      "Campeões de bilheteria" da Home). Testado ao vivo, ficou
      claramente errado: "popularity" do TMDb é um score GLOBAL (não é
      BR) pesado pra atividade recente no site deles — botava procedural
      com catálogo gigante (ex.: "O Mentalista", "Lei & Ordem: SVU") na
      frente de fenômeno real (ex.: Stranger Things ficava fora do top
      15 da Netflix). Trocado por nota.
   2) Nota CRUA sozinha (`sort_by=vote_average.desc`) tem o problema
      OPOSTO: favorece nicho de fã-base pequena/devotada sobre sucesso de
      massa. Rebecca notou algo estranho — "The Chosen" (que na
      verdade tem 966 votos, nota 8.80) ficava acima de Arcane (6138
      votos, nota 8.75), "Anne with an E" (4980 votos, nota 8.7) acima de
      Stranger Things (21741 votos, nota 8.55). Números reais do TMDb,
      conferidos via API — não bug nosso, é como voto crowd-sourced
      funciona: poucos votos tendem a ser só de fã fervoroso.

      Corrigido com uma média ponderada por VOLUME de voto
      (`weightedRating`, `functions.ts` — fórmula bayesiana clássica do
      antigo "Top Rated" do IMDb: `(v/(v+m))×R + (m/(v+m))×C`, `v` =
      vote_count, `R` = nota crua, `m = 1000`, `C` = nota média do pool
      de candidatos daquele streaming). A nota MOSTRADA no card continua
      sendo a real (`voteAverage`, sem modificar) — só a ORDEM da
      fileira usa a ponderação. Candidatos vêm de
      `sort_by=vote_count.desc` (não nota crua — garante que sucesso de
      massa entre no pool) em até `CANDIDATE_PAGES = 5` páginas, com
      `vote_count.gte=300` (mesmo piso de `fetchBoxOfficeChampions` da
      Home) pra não deixar título obscuro entrar no pool. Testado ao
      vivo: Breaking Bad, Avatar: A Lenda de Aang, Arcane, Better Call
      Saul e Rick e Morty ficam no topo da Netflix, com Stranger Things
      logo depois — o que bate com a expectativa real.

   Cada card mostra a posição no ranking, a nota (mesma que ordena) e o
   país de origem como emoji de bandeira (`countryFlagEmoji`,
   `functions.ts` — converte o código ISO em regional indicator symbols,
   sem tabela/imagem própria) — pedido explícito da Rebecca: "dai vc
   consegue ver da onde a série é, e qual nota tem". Mesmo badge de nota/
   país aparece nos resultados da busca (`index.tsx`), não só nas
   fileiras.

   **`vote_average` do TMDb já É global** — não é "nota do Japão" nem
   nota regional nenhuma, é a média de TODOS os votantes do TMDb no mundo
   inteiro (Rebecca notou o topo cheio de anime e achou que fosse nota
   "só do Japão" — na real é só que fã de anime vota muito/alto lá, é
   viés de gênero, não de fonte). BR-específico ou Rotten Tomatoes de
   verdade exigiriam outra fonte além do TMDb (RT não é exposto pela API
   do TMDb; teria que ser uma integração nova tipo OMDb, com API key
   própria) — não fizemos essa integração ainda, fica pra discutir se
   fizer falta depois de excluir anime (ver abaixo).

   **Anime fica de fora dessas fileiras** (`isAnime`, `functions.ts`) —
   pedido explícito da Rebecca: "vamos excluir os animes, depois vamos
   fazer uma categoria só pra eles" — categoria própria feita numa
   rodada seguinte, `@/pages/private/anime` (mesma lógica/layout dessa
   página, com a condição de anime invertida — ver `documents.md` de lá).
   Anime = gênero Animação (id 16) **+** produzido no
   Japão (idioma original "ja" OU país de origem "JP") — mesma definição
   já usada em `home/dashboard/functions.ts` (`extractThemeFilters`) pra
   distinguir anime de animação em geral. Só essa combinação é excluída
   — animação ocidental (Rick e Morty, Arcane, Avatar: A Lenda de Aang,
   O Incrível Mundo de Gumball) continua normalmente, conforme pedido
   ("atenção animes, animações ocidentais pode ficar"). Como o TMDb não
   tem um filtro pra excluir "animação japonesa" especificamente no
   `/discover` (só dá pra excluir o gênero inteiro), o filtro acontece
   client-side DEPOIS da resposta, antes de montar o pool de candidatos
   pra ponderação (ver acima). A busca do rodapé
   (`searchSeries`) NÃO aplica esse filtro — se a pessoa procura um anime
   pelo nome, ele aparece normalmente; a exclusão é só das fileiras de
   "melhor avaliada".

   Visual/scroll idêntico a `MovieRow` da Home (chevrons dos dois lados,
   `scrollBy` suave, centraliza quando cabe tudo) — só que `SeriesRow`
   fica dentro dessa página (não em `@/components`), seguindo a mesma
   convenção do resto do app de cada página ter seus componentes de
   grade/fileira próprios (ex.: `EditionGrid` em `pages/private/oscar`),
   não um componente genérico compartilhado entre páginas.

   Ids de provedor conferidos direto em `/watch/providers/tv?watch_region=BR`
   (TMDb não documenta isso em lugar fixo, muda por região) — "Max" hoje
   é o provider 1899 (rebranding da HBO Max).

2. **"Minhas séries"** — fileira que ROLA (`ScrollableRow.tsx`, mesmo
   componente das fileiras de streaming abaixo) das séries que o usuário
   SEGUE explicitamente (`service/FollowingSettings.ts`,
   `users/{uid}/following/{seriesId}`), com barra de progresso (episódios
   vistos/total, `followedSeriesProgress`, `service/FollowingSettings.ts`
   + `progressPercent` de `service/TimelineSettings.ts` — genérico o
   bastante pra não pertencer só a timeline). Clicar no card abre
   `SeriesDetail.tsx`. Lixeira no canto do card remove (com confirmação —
   perde o progresso de episódios todo, diferente do toggle rápido de
   seguir/deixar de seguir nas fileiras/busca).

2.5. **"Top 20 mais vistas em {ano atual}"** (`SeriesRow.tsx`, logo
   abaixo de "Minhas séries") — pedido explícito da Rebecca: "que segue o
   mesmo critério dos trailers". Mesma função do carrossel
   (`fetchTopSeriesOfTheYear`, `functions.ts`, `TOP_OF_YEAR_LIMIT = 20`),
   só `limit` diferente (5 no carrossel, 20 aqui) — `air_date.gte`/
   `air_date.lte` do ano atual inteiro (qualquer episódio de qualquer
   temporada, não só a primeira da série) + `sort_by=vote_count.desc`,
   sem ponderar nota. Pagina (`CANDIDATE_PAGES`) até preencher 20 depois
   da exclusão de anime — uma página só do TMDb (20 brutos) podia sobrar
   com menos que 20 depois do filtro.

   **Era uma grade (CSS grid, cards grandes) antes** — pedido explícito
   da Rebecca depois de ver a página pronta: "vamos fazer que nem nos
   outros blocos, cards menores, com arrows para rotacionar os cards".
   `ScrollableRow.tsx` foi extraído da mecânica de scroll que já existia
   em `SeriesRow.tsx` (chevron dos dois lados, `scrollBy` suave,
   centraliza quando cabe tudo) — `SeriesRow` foi refatorado pra usar o
   mesmo componente, sem duplicar a lógica. Card de "Minhas séries"
   reaproveita `.series-page__row-poster`/`__row-title-text` (mesmo
   tamanho dos itens das fileiras de streaming) — só acrescenta a
   lixeira, a barra de progresso e a contagem por cima
   (`.series-page__my-item*`).

3. **Busca** (rodapé, mesmo padrão visual do rodapé da Home) —
   `searchSeries` (`/search/tv`), cada resultado com o mesmo botão de
   "seguir" das fileiras.

**Por que NÃO tem o `@/components/watchButton` global aqui** — o
"já vi" genérico (boolean por filme/série inteira,
`service/WatchedSettings.ts`) não é o que a Rebecca pediu pra série: o
pedido é especificamente marcar quais EPISÓDIOS já foram vistos. Por
isso cada pôster (fileiras de streaming + busca) tem um botão próprio de
"seguir" (`Plus`/`Check`, mesmo estilo visual/posição do `WatchButton`
mas ícone e collection diferentes) — clicar nele resolve temporadas +
TODOS os episódios no TMDb (`fetchSeriesWithEpisodes`, `functions.ts`) e
grava o doc em `users/{uid}/following`; é isso que libera marcar episódio
por episódio depois.

**Clicar no PÔSTER** (`handlePosterClick`, `index.tsx`) — série AINDA
NÃO seguida abre o `@/components/movieDetail` genérico de sempre
(sinopse, elenco, onde assistir), igual ao resto do app. Série JÁ
seguida abre `SeriesDetail.tsx` DIRETO em vez do MovieDetail — bug
relatado pela Rebecca ao vivo (screenshot: seguiu "Arcane", clicou no
pôster de novo e caiu no MovieDetail genérico sem jeito nenhum de marcar
episódio) — uma vez seguida, marcar episódio é a ação mais útil que
reler sinopse de novo.

## `service/FollowingSettings.ts`

Renomeado de "series" pra "following" — pedido explícito da Rebecca,
pensando à frente: "assim ficamos livres para depois fazer uma timeline
de séries. Por exemplo séries da Marvel... e aí sim cai dentro da
timeline categoria series". Ou seja: essa collection é só o registro cru
de progresso por série seguida; TIMELINE (`service/TimelineSettings.ts`)
fica livre pra, mais pra frente, AGRUPAR séries seguidas numa timeline
nomeada/categorizada — sem misturar os dois conceitos no mesmo dado.
Série ainda sem timeline nenhuma por enquanto (decisão explícita de
adiar, ver `documents.md` de `pages/private/timelines` — "preparando pra
categorização").

Uma fonte de verdade por usuário: `users/{uid}/following/{seriesId}`
(chave = id da série no TMDb). Pedido explícito da Rebecca sobre o que
gravar: "o nome da série, a quantidade de temporadas, os episódios e uma
tag pra dizer se o episódio foi visto ou não" — diferente da primeira
versão (que só guardava a CONTAGEM de episódios por temporada + um array
separado de chaves "vistas"), agora o doc já nasce com TODOS os
episódios de TODAS as temporadas resolvidos no TMDb no momento de
seguir (`fetchSeriesWithEpisodes`, `pages/private/series/functions.ts`
— busca a lista de temporadas e depois os episódios de cada uma em
paralelo), cada um com a própria tag `watched` (começa `false`).

`seasons`/`episodes` são MAPAS (chave = número, como string — Firestore
só aceita chave de mapa como string), não array — de propósito: marcar
um episódio como visto vira um update ATÔMICO e direcionado
(`setEpisodeWatched`, dot-path
`seasons.{temporada}.episodes.{episódio}.watched`), sem precisar ler o
doc inteiro pra reescrever um array toda vez. `totalSeasons` é gravado
explícito (não só derivável de `Object.keys(seasons).length`) — pedido
explícito da Rebecca, e mais legível abrindo o doc direto no console do
Firestore. `followedSeriesProgress` soma episódios vistos/total
percorrendo o mapa — usado pela grade e por `SeriesDetail`.

Cada episódio também guarda `airDate` (`"YYYY-MM-DD"` do TMDb, `""`
quando ainda não agendado) e o doc guarda `status` da série no momento
de seguir (`"Returning Series"`/`"Ended"`/`"Canceled"`/etc., não
atualizado depois). `episodeAiringInfo(episode, seriesStatus)` decide o
que mostrar no lugar do checkbox pra episódio ainda não lançado — data
futura formatada, `"Aguardando data"` (sem data agendada, série ativa) ou
`"Cancelado"` (sem data agendada, `status === "Canceled"`) — pedido
explícito da Rebecca: "capítulos que não foram lançados aí, pode estar
com mais opacity e a data que vai ser lançado... ou então algo como
'aguardando data' ou 'cancelado'". Doc gravado ANTES desse campo existir
tem `airDate`/`status` ausentes — tratado como `""` (cai no fallback
"Aguardando data"), sem migration nenhuma pra dado antigo.

## `SeriesDetail.tsx`

Dialog de overlay (mesmo padrão de `@/components/movieDetail` e
`@/pages/private/timelines/TimelineDetail.tsx`) — NÃO busca episódio no
TMDb aqui, o doc (`FollowedSeries.seasons`) já vem com tudo desde que a
série foi seguida, então só LÊ o que já está carregado, sem loading/
fetch nenhum ao abrir uma temporada.

**Acordeão de temporadas** (pedido explícito da Rebecca: "uma lista de
capítulos colapsável, que eu posso marcar o capítulo inteiro, ou se
abrir eu posso marcar um por 1") — cada temporada é uma seção própria
que expande/colapsa (`expandedSeasons`, `Set<number>`); abre já com a
primeira temporada NÃO 100% vista expandida (poupa um clique de quem tá
em dia, resto continua colapsado/expansível). O cabeçalho de CADA
temporada, mesmo fechada, já tem um botão (círculo, mesmo estilo do
`WatchButton`) pra marcar/desmarcar a temporada inteira sem precisar
expandir — só considera episódio já lançado (`seasonAiredProgress`, não
dá pra marcar como visto o que ainda não foi ao ar); se já tava tudo
marcado, desmarca tudo, senão marca o que falta.

**Episódio ainda não lançado** — linha com opacidade reduzida (não é
mais um botão, é uma `<div>`: não tem ação nenhuma pra fazer com ele
ainda), sem checkbox, mostrando a `label` de `episodeAiringInfo` (data/
"Aguardando data"/"Cancelado") no lugar. Um aviso (`"Episódios sem
marcação ainda não foram ao ar"`) aparece no fim da lista expandida
quando a temporada tem pelo menos um episódio futuro, pra não parecer
que sobrou episódio "esquecido" sem marcar.

## Não implementado ainda (fora de escopo dessa rodada)

- "Melhor avaliada" é a nota média dos usuários do TMDb, não audiência/
  visualização real nenhuma (TMDb não expõe isso) — considerado e
  descartado nessa rodada: a Netflix publica um Top 10 semanal real por
  país em `netflix.com/tudum/top10/brazil`, scrapável do mesmo jeito que
  `service/IngressoSettings.ts` já faz com o ingresso.com (confirmado ao
  vivo), mas só ela disponibiliza isso publicamente — os outros 5
  streamings não têm equivalente. Rebecca optou por nota (TMDb, mesma
  fonte pra todo mundo) em vez de misturar fonte real só pra um provedor.
- Sem paginação nas fileiras de streaming (`ROW_LIMIT = 20` por
  provedor) nem na busca (`SEARCH_LIMIT = 12`).
- Timeline categoria "series" (agrupar séries seguidas, ex.: "séries da
  Marvel") — decisão explícita de adiar, Rebecca ainda vai pensar melhor
  no formato.
- **`firestore.rules` mudou** (`users/{uid}/series` → `users/{uid}/following`)
  — precisa `firebase deploy --only firestore:rules` pra valer de
  verdade; sem isso, seguir uma série falha com permissão negada contra
  as regras antigas ainda publicadas.
