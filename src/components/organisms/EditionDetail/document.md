# EditionDetail (organismo)

Uma edição: progresso de filmes vistos + indicados por categoria.

## Props
- `config`: `AwardConfig`
- `edition`: `AwardEdition`
- `uid`: `string | null`
- `onBack`: `() => void`
- `onSelectNominee`: `(nominee: AwardNominee) => void`
- `onOpenAddData`: `() => void`

## Depende de
`components/atoms/AwardButton`, `components/atoms/MediaGrid`, `components/molecules/MediaCard`, `actions/helpers/opencard`, `actions/awards/editions`, `contexts/MediaCards`

## Estilo
`style.scss` — classes `edition-detail` e `edition-detail__*` (BEM).
