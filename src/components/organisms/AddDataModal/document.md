# AddDataModal (organismo)

Cola o JSON gerado por uma IA (prompt de pesquisa incluso) e grava os indicados da edição no Firestore.

## Props
- `config`: `AwardConfig`
- `edition`: `AwardEdition`
- `onClose`: `() => void`
- `onSaved`: `(headline: string, categories: AwardCategory[]) => void`

## Depende de
`components/atoms/AwardButton`, `components/atoms/Modal`, `components/atoms/Spinner`, `components/atoms/StatusMessage`, `actions/awards/adddata`, `actions/awards/editions`

## Estilo
`style.scss` — classes `add-data-modal` e `add-data-modal__*` (BEM).
