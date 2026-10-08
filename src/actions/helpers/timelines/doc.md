# actions/helpers/timelines

**Página/ciclo:** `helpers` → `timelines`

Ciclo das timelines: criar, listar, seguir, atualizar filmes, apagar e calcular progresso (Firestore).

## Funções (na ordem em que o ciclo acontece)
- `movieKey` — Chave `movie-<id>` / `tv-<id>` usada em vistos, notas e timelines.
- `timelineMovieKey` — Chave de um título de timeline (mesmo formato de `movieKey`). usado em: franchises/dashboard, helpers/timelineai, helpers/timelinedetail, TimelineCard
- `createTimeline` — Cria uma timeline do usuário no Firestore. usado em: animes/dashboard, awards/timelinesync, helpers/addtotimeline, helpers/createtimeline, presentation/cycletimelineai, series/dashboard, …
- `fetchTimelines` — Lê as timelines do usuário (as mais novas primeiro) e corrige formatos antigos. usado em: helpers/addtotimeline, helpers/pagefirebase, timelines/mytimelines
- `fetchTimelineByAwardEdition` — Acha a timeline de uma edição de premiação, se já existir. usado em: awards/timelinesync
- `fetchTimelineByFranchise` — Acha a timeline de uma franquia, se já existir. usado em: franchises/dashboard
- `createFranchiseTimeline` — Cria a timeline de uma franquia (um id fixo por franquia). usado em: franchises/dashboard
- `updateTimelineMovies` — Troca a lista de títulos de uma timeline. usado em: awards/timelinesync, helpers/addtotimeline
- `setTimelineFollowed` — Marca ou desmarca a timeline como seguida. usado em: timelines/mytimelines
- `deleteTimeline` — Apaga uma timeline. usado em: timelines/mytimelines
- `timelineProgress` — Quantos títulos da timeline já foram vistos. usado em: presentation/cycleprogress, TimelineCard, FollowedTimelinesRow
- `progressPercent` — Porcentagem (0 a 100) de visto. usado em: presentation/cycleprogress, SeasonItem, TimelineCard, FollowedTimelinesRow, SeriesDetail

## Tipos
- `ContentType`
- `TimelineCategoryFilter`
- `TimelineMovie`
- `Timeline`
