# StatusMessage (átomo)

Mensagem de estado padrão: `loading` (com spinner opcional), `error`, `empty` ou `success`; `compact` serve para feedback de formulário.

## Props
- `variant`: `"loading" | "error" | "empty" | "success"`
- `children`: `ReactNode`
- `spinner?`: `boolean`
- `compact?`: `boolean`

## Depende de
`components/atoms/Spinner`

## Estilo
`style.scss` — classes `status-message` e `status-message__*` (BEM).
