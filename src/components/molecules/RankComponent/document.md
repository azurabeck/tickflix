# RankComponent (molécula)

Lista numerada (top N) com pôster e título, usada nos rankings da home.

## Props
- `title`: `ReactNode`
- `items`: `RankItem[]`
- `sizes?`: `[number, number]`
- `loading?`: `boolean`
- `error?`: `string | null`
- `emptyMessage?`: `string`
- `disabled?`: `boolean`
- `onOpen`: `(item: RankItem) => void`
- `onToggleChecked`: `(item: RankItem) => void`
- `onRate`: `(item: RankItem, rating: number | null) => void`

## Depende de
`components/atoms/RatingInput`

## Estilo
`style.scss` — classes `rank-component` e `rank-component__*` (BEM).
