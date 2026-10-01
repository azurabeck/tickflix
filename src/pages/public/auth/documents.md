# Auth (login/cadastro)

Primeira tela da aplicação. Layout responsivo replicando o mockup
(`Desktop Btn Enabled.svg` / `Mobile Btn Disabled.svg`): imagem de destaque
em tela cheia, com um degradê branco que "revela" o formulário — do lado
esquerdo no desktop, embaixo no mobile.

## Fundo dinâmico

A imagem, o nome e os detalhes do destaque vêm da collection `highlight`
do Firestore:

| campo        | tipo   | uso                                             |
| ------------ | ------ | ------------------------------------------------ |
| `image_url`  | string | usado como `background-image` da página          |
| `name`       | string | mostrado no badge "Filme: {name}" (canto inferior)|
| `info`       | string | usado como `title` (tooltip) do badge             |

Um doc é sorteado aleatoriamente entre todos os documentos da collection a
cada carregamento da página. Se a busca falhar ou a collection estiver
vazia, a página cai para o fundo cinza padrão sem quebrar o login.

## Login

Usa `signInWithEmailAndPassword` do Firebase Auth — o campo "usuário" do
mockup é enviado como e-mail. O botão "Acessar" só habilita com os dois
campos preenchidos.

## Cadastro — mesma tela, `mode` alterna o formulário

Pedido explícito da Rebecca: "vamos criar uma area para usuário fazer uma
conta, ou logar com google". O link "Abra sua conta" (que já existia no
layout, só sem ação — era o TODO antigo) agora alterna um estado local
(`mode: "login" | "signup"`) pra trocar o formulário INTEIRO na mesma
tela, em vez de navegar pra uma rota separada — mais simples que criar
`ROUTES.SIGNUP` + uma página nova pra um formulário que é, na prática, só
3 campos a mais. Cadastro usa `createUserWithEmailAndPassword` (e-mail +
senha + confirmar senha, validado no client antes de gastar uma chamada
ao Firebase — `isSignupFormValid`, `functions.ts`: e-mail com "@", senha
com 6+ caracteres — mesmo mínimo que o Firebase exige, `auth/weak-password`
mapeado em `mapAuthError`). Trocar de aba limpa o erro da aba anterior
(`switchMode`) — senão um erro de login ficava preso na tela depois de ir
pro cadastro.

## Google — `signInWithPopup`, visível nos dois modos

Um só botão "Entrar com Google" (`GoogleAuthProvider` + `signInWithPopup`,
ícone "G" oficial embutido como SVG — lucide-react não tem ícone de
marca) funciona pros DOIS casos ao mesmo tempo: login de quem já tem
conta E criação automática de quem nunca logou (o Firebase decide
sozinho, não precisa saber de antemão se é login ou cadastro). Por isso
fica fora do `<form>` de cada modo, sempre visível, com um divisor "ou"
separando das duas abas. Fechar o popup sem escolher conta
(`auth/popup-closed-by-user`/`auth/cancelled-popup-request`) não acende
erro nenhum — é uma desistência do usuário, não uma falha de verdade.

**Precisa estar habilitado no Firebase Console** (Authentication →
Sign-in method → Google) pra funcionar de verdade — isso é configuração
do projeto, não dá pra ligar por código.

Nenhum dos três fluxos (login/cadastro/Google) navega manualmente em caso
de sucesso — `onAuthStateChanged` (App.tsx) já redireciona pra Home
sozinho assim que o Firebase confirma o usuário, pra qualquer um dos três.
