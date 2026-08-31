# Home (privada)

Tela pós-login — só renderiza o [Dashboard](./dashboard/documents.md)
direto. Não tem mais alternância de view: o wizard guiado foi removido,
criar timeline é só pelo painel "Criar uma nova timeline" dentro do
próprio Dashboard, então não existe mais um estado "primeiro login"
especial pra decidir.

`handleLogout` (chamada ao Firebase Auth) fica em `functions.ts`, passado
pro Dashboard.
