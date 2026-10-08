# MediaRailSection (organismo)

Seção com uma fileira de cards (um aberto por vez), setas e, opcionalmente, "ver todos".

## Props
- `title`: `ReactNode`
- `items`: `T[] | null`
- `loading?`: `boolean`
- `error?`: `string | null`
- `emptyMessage?`: `string`
- `hideWhenEmpty?`: `boolean`
- `toolbar?`: `ReactNode`
- `onSeeAll?`: `() => void`
- `seeAllLabel?`: `string`
- `onOpenItem?`: `(item: MediaItem) => void`

## Depende de
`components/atoms/HomeSection`, `components/molecules/MediaCard`, `components/atoms/RailControls`, `components/atoms/ScrollRail`, `components/atoms/StatusMessage`, `actions/helpers/opencard`, `actions/helpers/scrollrail`

## Estilo
Sem estilo próprio: usa as classes dos componentes que compõe.
