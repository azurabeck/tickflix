# SeasonItem (molécula)

Temporada do acordeão: cabeçalho com progresso e "marcar temporada inteira"; aberta, lista os episódios.

## Props
- `seriesId`: `number`
- `seriesStatus`: `string`
- `seasonNumber`: `number`
- `season`: `FollowedSeason`
- `uid`: `string | null`
- `expanded`: `boolean`
- `onToggleExpanded`: `() => void`
- `onToggleWholeSeason`: `() => void`
- `onToggleEpisode`: `(episode: number) => void`

## Depende de
`components/molecules/EpisodeRow`, `actions/helpers/seriesdetail`, `actions/helpers/followed`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `season-item` e `season-item__*` (BEM).
