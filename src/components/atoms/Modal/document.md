# Modal (átomo)

Modal padrão: overlay, painel, botão de fechar e título. `size` (sm|md|lg|xl) define a largura; `scroll="content"` deixa o painel fixo e só o conteúdo rola.

## Props
- `onClose`: `() => void`
- `title?`: `ReactNode`
- `size?`: `"sm" | "md" | "lg" | "xl"`
- `scroll?`: `"panel" | "content"`
- `className?`: `string`
- `children`: `ReactNode`

## Depende de
Nada além de bibliotecas.

## Estilo
`style.scss` — classes `modal` e `modal__*` (BEM).
