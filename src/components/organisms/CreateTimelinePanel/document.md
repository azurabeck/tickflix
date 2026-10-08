# CreateTimelinePanel (organismo)

Faixa "Criar uma nova timeline": o texto digitado abre o modal que monta a timeline com IA.

## Props
- `uid`: `string | null`
- `onCreated?`: `() => void`
- `categoryLock?`: `ContentType`
- `placeholder?`: `string`

## Depende de
`components/atoms/PageContainer`, `components/organisms/CreateTimelineModal`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `create-timeline-panel` e `create-timeline-panel__*` (BEM).
