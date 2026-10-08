# HomeSection (átomo)

Seção com título, ações à direita (setas / ver todos), barra de ferramentas opcional e estados de carregando/erro.

## Props
- `title?`: `ReactNode`
- `actions?`: `ReactNode`
- `loading?`: `boolean`
- `error?`: `string | null`
- `toolbar?`: `ReactNode`
- `variant?`: `"default" | "purple"`
- `wide?`: `boolean`
- `gapAfter?`: `boolean`
- `className?`: `string`
- `children`: `ReactNode`

## Depende de
`components/atoms/StatusMessage`

## Estilo
`style.scss` — classes `home-section` e `home-section__*` (BEM).
