# PosterGridModal (organismo)

Modal "ver todos": grade rolável com todos os cards (painel fixo, só a grade rola).

## Props
- `title`: `string`
- `items`: `MediaItem[] | null`
- `error?`: `string | null`
- `emptyMessage?`: `string`
- `onOpenItem?`: `(item: MediaItem) => void`
- `onClose`: `() => void`

## Depende de
`components/atoms/MediaGrid`, `components/atoms/Modal`, `components/atoms/StatusMessage`, `components/molecules/MediaCard`, `actions/helpers/opencard`

## Estilo
Sem estilo próprio: usa as classes dos componentes que compõe.
