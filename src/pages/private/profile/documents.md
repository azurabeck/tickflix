# Profile ("Meu perfil")

Item novo do menu da conta (`@/components/userMenu`) — pedido explícito
da Rebecca ao copiar a estrutura do projeto "mailbook" (livro-app) pro
TickFlix. Básico, mas funcional de verdade (ela escolheu essa opção
quando perguntada, em vez de só um link morto):

- Avatar (`@/components/avatar` — foto do Google se tiver, senão a
  inicial do nome).
- **Nome**: editável, grava em `auth.currentUser` via `updateProfile`
  (`functions.ts`, `saveDisplayName`). Botão "Salvar" só habilita quando
  o campo mudou de verdade (`isDirty`) e não está vazio — não é um botão
  sempre ativo mandando a mesma chamada à toa.
- **E-mail**: só leitura. Trocar e-mail de verdade exige reautenticação
  recente no Firebase (`updateEmail` rejeita sem isso) — fora de escopo
  nessa rodada, não tem fluxo de "confirme sua senha" ainda.
- **Membro desde**: `user.metadata.creationTime` (Firebase já guarda),
  formatado com `toLocaleDateString()` — sem biblioteca de data nova só
  pra isso.

Sem upload de avatar próprio ainda — a foto só vem do provider (Google).
