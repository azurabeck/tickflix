# SuggestionCard (molécula)

Card de sugestão (pôster com degradê e ações), ligado ao estado global (useMediaCards).

## Props
- `id`: `number`
- `mediaType`: `"movie" | "tv"`
- `title`: `string`
- `posterPath`: `string | null`
- `available?`: `boolean`
- `category?`: `"series" | "animes"`

## Depende de
`components/organisms/AddToTimelineButton`, `contexts/MediaCards`

## Estilo
`style.scss` — classes `suggestion-card` e `suggestion-card__*` (BEM).
