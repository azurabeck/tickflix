# Button

Botão genérico reutilizável em toda a aplicação.

## Props

| prop        | tipo                                | default     | descrição                                  |
| ----------- | ------------------------------------ | ----------- | ------------------------------------------- |
| `variant`   | `"primary" \| "ghost"`               | `"primary"` | estilo visual do botão                       |
| `loading`   | `boolean`                            | `false`     | mostra spinner e desabilita o botão          |
| `...rest`   | `ButtonHTMLAttributes<HTMLButton>`   | —           | qualquer prop nativa de `<button>` (`disabled`, `onClick`, `type`...) |

Lógica de classes fica em `functions.ts` (`getButtonClassName`) — `index.tsx`
só cuida do template.

## Exemplo

```tsx
import Button from "@/components/button";

<Button variant="primary" disabled={!isValid} loading={submitting}>
  Acessar
</Button>
```
