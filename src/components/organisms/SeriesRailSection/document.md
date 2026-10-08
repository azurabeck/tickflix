# SeriesRailSection (organismo)

Fileira de séries/animes. Com progressFilters (Minhas séries/Meus animes) ganha os filtros Concluídos / Em Progresso / Em breve / Não iniciado (vários ao mesmo tempo; começa em Em Progresso).

## Props
- `title`: `ReactNode`
- `items`: `MediaItem[] | null`
- `loading?`: `boolean`
- `error?`: `string | null`
- `emptyMessage?`: `string`
- `progressFilters?`: `boolean`

## Depende de
`components/atoms/FilterChips`, `components/organisms/MediaRailSection`, `contexts/MediaCards`, `actions/helpers/progress`

## Estilo
Sem estilo próprio: usa as classes dos componentes que compõe.
