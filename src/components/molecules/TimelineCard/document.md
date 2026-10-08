# TimelineCard (molécula)

Card de uma timeline: pôsteres de prévia, seguir (estrela), apagar e progresso de visto.

## Props
- `timeline`: `Timeline`
- `watchedMap`: `Map<string, number>`
- `disabled`: `boolean`
- `deleting`: `boolean`
- `onOpen`: `() => void`
- `onToggleFollow`: `() => void`
- `onDelete`: `() => void`

## Depende de
`components/atoms/Spinner`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `timeline-card` e `timeline-card__*` (BEM).
