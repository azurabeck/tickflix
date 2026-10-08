# FollowedTimelinesRow (organismo)

Faixa "Timelines que você segue": um card por timeline com o progresso de visto.

## Props
- `timelines`: `Timeline[]`
- `watchedMap`: `Map<string, number>`
- `onSelect`: `(timeline: Timeline) => void`

## Depende de
`components/atoms/PageContainer`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `followed-timelines-row` e `followed-timelines-row__*` (BEM).
