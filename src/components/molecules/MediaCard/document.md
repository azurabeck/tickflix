# MediaCard (molécula)

Card de filme (type "movie") ou série/anime (type "serie"), ligado ao estado global (useMediaCards).

## Props
- `item`: `MediaItem`
- `isOpen`: `boolean`
- `onSelect`: `() => void`
- `onOpen?`: `(item: MediaItem) => void`
- `badge?`: `ReactNode`
- `subtitle?`: `string`
- `isModal?`: `boolean`

## Depende de
`components/atoms/RatingInput`, `contexts/MediaCards`, `actions/helpers/followed`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `media-card` e `media-card__*` (BEM).
