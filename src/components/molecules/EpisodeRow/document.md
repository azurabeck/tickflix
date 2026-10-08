# EpisodeRow (molécula)

Linha de episódio: marcar como visto (se já foi ao ar) + botão (i) com a descrição.

## Props
- `seriesId`: `number`
- `seasonNumber`: `number`
- `episodeNumber`: `number`
- `episode`: `FollowedEpisode`
- `airing`: `EpisodeAiringInfo`
- `disabled`: `boolean`
- `onToggle`: `() => void`

## Depende de
`actions/helpers/seriesdetail`, `actions/helpers/followed`

## Estilo
`style.scss` — classes `episode-row` e `episode-row__*` (BEM).
