# MajorReleasesModal (organismo)

"Ver até 12 meses": lançamentos agrupados por mês, com filtro Tudo / Disponível.

## Props
- `movies`: `MajorReleaseMovie[] | null`
- `error`: `string | null`
- `onClose`: `() => void`

## Depende de
`components/atoms/MediaGrid`, `components/atoms/Modal`, `components/atoms/StatusMessage`, `components/molecules/MediaCard`, `actions/movies/majorreleases`, `actions/helpers/opencard`

## Estilo
`style.scss` — classes `major-releases-modal` e `major-releases-modal__*` (BEM).
