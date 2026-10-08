# SeriesDetail (organismo)

Detalhe de uma série/anime seguido: capa + episódios por temporada + elenco + onde assistir.

## Props
- `series`: `FollowedSeries`
- `uid`: `string | null`
- `onClose`: `() => void`
- `onToggleEpisode`: `(series: FollowedSeries, season: number, episode: number) => void`
- `onToggleSeason`: `(series: FollowedSeries, season: number, episodes: number[], watched: boolean) => void`

## Depende de
`components/atoms/DetailPanel`, `components/molecules/MovieDetailCast`, `components/molecules/MovieDetailHeader`, `components/molecules/MovieDetailProviders`, `components/molecules/SeasonItem`, `actions/helpers/moviedetail`, `actions/helpers/seriesdetail`, `actions/helpers/followed`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `series-detail` e `series-detail__*` (BEM).
