# EpisodicCatalog (organismo)

Layout das páginas Séries e Animes: minha lista, ranks + IA e uma fileira por streaming. Só monta; as sections vêm prontas de cada página.

## Props
- `page`: `{ category: "series" | "animes"; timelineType: "series" | "animes"; labels: { mine: string; empty: string; mostWatched: string; bestRatedOn: string; placeholder: string } }`
- `dashboard`: `PageDashboard`
- `hero`: `Section<HeroTrailer>`
- `mine`: `{ items: MediaItem[]; loading: boolean }`
- `mostWatched`: `Section<RankItem>`
- `myNotes`: `MyNotes`
- `useBestRatedOn`: `(dashboard: PageDashboard, providerId: number) => Section<MediaItem>`

## Depende de
`components/atoms/HomeGroup`, `components/organisms/BestRatedOnRail`, `components/organisms/CreateTimelinePanel`, `components/organisms/FollowedTimelinesRow`, `components/organisms/HeroCarousel`, `components/organisms/RankSection`, `components/organisms/SeriesRailSection`, `components/organisms/TimelineDetail`, `contexts/MediaCards`, `actions/helpers/rank`, `actions/helpers/section`, `actions/helpers/streamings`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `episodic-catalog` e `episodic-catalog__*` (BEM).
