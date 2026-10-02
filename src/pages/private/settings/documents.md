# Settings ("Configurações")

Item novo do menu da conta (`@/components/userMenu`), mesma origem do
`pages/private/profile` (ver `documents.md` de lá). Duas seções hoje:

## Idioma

Reaproveita `@/components/languageSwitcher`, o MESMO componente já usado
solto no navbar. Novas seções simples (ex.: notificação, privacidade)
entram como mais um `&__section` dentro dessa mesma página, não
precisam de estrutura nova.

## Chave do Gemini (`GeminiKeyCard.tsx`)

Pedido explícito da Rebecca, depois de ver a tela de Configurações do
projeto "mailbook" (livro-app, `C:\...\ReactJS\livro-app`): "configurações
deve ser igual.. ou seja deve ensinar como pegar a api key do gemini, e
deixar o usuário habilitar a propria apikey para utilizar no site" —
estrutura, passo a passo e textos seguem o mailbook de perto (mesmo
pedido de "deixar igualzinho" já feito pro `UserMenu`).

**Por que isso importa**: o Gemini resolve o painel "Criar uma nova
timeline" (`service/IASettings.ts`, `geminiGenerateJSON`) — até aqui todo
mundo usava a MESMA chave da plataforma (`VITE_GEMINI_API_KEY`). Com a
própria chave, o uso (e o custo) passa a contar na conta Google de quem
configurou.

**Onde mora a lógica** — tudo em `service/IASettings.ts`, não num arquivo
à parte (diferente do mailbook, que separa `services/userSettings.ts` de
`services/ai/gemini.ts` — aqui já existia um arquivo só pra concerns de
IA, não duplicamos a divisão):

- `getUserGeminiKey`/`setUserGeminiKey` — localStorage, chave por uid
  (`tickflix-user-{uid}-gemini-key`) — nunca sai do navegador de quem
  configurou, só é usada direto nas chamadas pro Google feitas daqui.
  Mesmo raciocínio do mailbook.
- `validateGeminiKey(apiKey)` — confere se a chave funciona ANTES de
  salvar (`GET /v1beta/models?pageSize=1`, chamada leve que não gasta
  tokens de geração) — testado ao vivo com uma chave inválida: o Google
  responde 400 "API key not valid", a tela mostra o erro e a chave
  INVÁLIDA não é salva (`localStorage` confirmado vazio).
- `geminiGenerateJSON` — `getUserGeminiKey() || GEMINI_API_KEY`: a chave
  do usuário sempre ganha da chave da plataforma quando as duas existem.

**UI** (`GeminiKeyCard.tsx`): descrição → passo a passo linkando pro
Google AI Studio → status (ícone + "está usando sua chave"/"está usando
a chave padrão da plataforma") → campo com toggle mostrar/esconder (tipo
`password`/`text`) → Salvar/Remover chave → rodapé avisando que a chave
fica só neste navegador (percorrer de outro computador exige colar de
novo — mesmo aviso do mailbook).
