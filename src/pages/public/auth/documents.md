# Auth (login)

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
mockup é enviado como e-mail (único provider configurado no projeto por
enquanto). O botão "Acessar" só habilita com os dois campos preenchidos.

## Pendências

- Fluxo de "Abra sua conta" (cadastro) ainda não existe — o link está no
  layout mas sem ação, só a tela de login foi pedida nesta etapa.
