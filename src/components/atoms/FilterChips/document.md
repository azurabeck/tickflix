# FilterChips (átomo)

Grupo de chips de filtro. `active` guarda os valores marcados; `onToggle` avisa qual foi clicado (quem usa decide se é escolha única ou múltipla).

## Props
- `options`: `FilterChip<T>[]`
- `active`: `T[]`
- `onToggle`: `(value: T) => void`
- `ariaLabel?`: `string`

## Depende de
Nada além de bibliotecas.

## Estilo
`style.scss` — classes `filter-chips` e `filter-chips__*` (BEM).
