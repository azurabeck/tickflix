# UserMenu

Avatar + menu suspenso da conta, no navbar — pedido explícito da Rebecca:
"da uma olhada lá no menu de usuário do projeto mailbook [na prática,
`C:\...\ReactJS\livro-app`]... vamos fazer o mesmo aqui no tickflix.
inclusive o que ta no menu, podemos deixar igualzinho ta lá". Estrutura
copiada de lá (`src/components/organisms/UserMenu` do livro-app):

- Trigger: `@/components/avatar` (foto ou inicial) + chevron.
- Dropdown: identidade (nome em negrito + e-mail) → **Meu perfil**
  (`ROUTES.PROFILE`) → **Configurações** (`ROUTES.SETTINGS`) → **Sair**
  (vermelho, separado dos outros dois, `signOut` + navega pro login).
- Fecha sozinho ao clicar fora, apertar Esc, ou trocar de rota — mesmo
  trio de cuidados do componente original.

Substituiu o botão "Sair" solto que vivia em `@/components/appNav`
(histórico desse botão — posição/agrupamento com a busca — está nos
comentários do próprio `appNav/styles.scss`, não repetido aqui).

## Sem store global de auth

Diferente do livro-app (`useAuthStore`, zustand), o TickFlix não tem
estado de auth centralizado — todo componente que precisa do usuário lê
`auth.currentUser` direto (mesmo padrão já usado em `MovieDetail`,
`dashboard/index.tsx` etc.). Funciona aqui porque `UserMenu` só é
montado dentro de `PrivateLayout`, que `App.tsx` já garante só renderizar
com um usuário resolvido (`onAuthStateChanged`).

## "Meu perfil"/"Configurações" — páginas básicas, não só links mortos

Pedido explícito, depois de perguntado: "Crie páginas básicas já" (não
só o menu visual) — ver `documents.md` de `pages/private/profile` e
`pages/private/settings`.
