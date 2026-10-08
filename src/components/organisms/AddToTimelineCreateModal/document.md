# AddToTimelineCreateModal (organismo)

Criar uma timeline nova escolhendo os títulos (o título clicado já entra).

## Props
- `uid`: `string`
- `initialMovie`: `AddableMovie`
- `onClose`: `() => void`
- `onSaved`: `() => void`

## Depende de
`components/atoms/Modal`, `components/atoms/Spinner`, `components/atoms/StatusMessage`, `actions/helpers/addtotimeline`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `add-to-timeline-create-modal` e `add-to-timeline-create-modal__*` (BEM).
