# CreateTimelineModal (organismo)

Conversa com a IA para montar/refinar uma timeline e salvá-la.

## Props
- `uid`: `string`
- `initialDescription`: `string`
- `onClose`: `() => void`
- `onSaved`: `() => void`
- `categoryLock?`: `ContentType`

## Depende de
`components/atoms/Modal`, `components/atoms/Spinner`, `actions/helpers/createtimeline`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `create-timeline-modal` e `create-timeline-modal__*` (BEM).
