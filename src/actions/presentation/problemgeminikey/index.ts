import type { Cycle } from "@/actions/presentation/cycles";

// Problema 2: a pessoa colar a própria chave do Gemini. Os trechos de código são lidos do próprio projeto, então são sempre os reais.
// usado em: presentation/cycles
export const GEMINIKEY_PROBLEM: Cycle = {
  id: "geminikey",
  title: "O insert manual da chave do Gemini",
  intro: "A IA do TickFlix usa o Gemini, do Google. Por padrão, passa pelo servidor com a chave da plataforma. Em Configurações, a pessoa pode usar a dela.",
  problem: {
    why: "A chave da plataforma fica no servidor e tem uma cota diária só, dividida entre todo mundo. Quando a cota acaba, ninguém consegue criar timelines nem receber sugestões até o dia seguinte. O app chega a avisar: \"A cota diária da IA acabou\".",
    what: "Em Configurações, a pessoa cola a própria chave do Gemini. O app testa a chave, guarda só no navegador dela e passa a usá-la, com a cota dela: na criação de timelines, direto do navegador ao Google; nas sugestões, junto do pedido ao nosso servidor, que a usa só naquela chamada e não a guarda. Sem chave própria, usa a da plataforma.",
  },
  steps: [
    {
      id: "card",
      title: "O cartão em Configurações",
      text: "O cartão mostra qual chave está em uso (a da plataforma ou a da pessoa) e tem o campo onde ela cola a chave, com um passo a passo de como gerar uma no Google AI Studio.",
      code: { file: "src/components/organisms/GeminiKeyCard/index.tsx", name: "GeminiKeyCard", from: 'className="gemini-key-card__status"', lines: 4 },
    },
    {
      id: "save",
      title: "Salvar: testa e guarda",
      text: "Ao enviar, o submit liga o loading do botão, testa a chave e só então guarda. Se o teste falhar, mostra o motivo e não guarda nada. Clique em uma parte.",
      code: { file: "src/actions/settings/geminikey/index.ts", name: "submit" },
      children: [
        {
          id: "validate",
          title: "Testa na API do Google",
          text: "O validateGeminiKey faz um pedido simples ao Google (listar modelos) com a chave. Se o Google responder com erro, a chave não vale e o motivo vai para a mensagem na tela.",
          code: { file: "src/service/IASettings.ts", name: "validateGeminiKey" },
        },
        {
          id: "store",
          title: "Guarda só neste navegador",
          text: "O setUserGeminiKey grava a chave no localStorage, com o id do usuário na chave (cada pessoa tem a sua). Mandar vazio remove a chave. O navegador só a envia quando a IA é usada (veja a etapa 3).",
          code: { file: "src/service/IASettings.ts", name: "setUserGeminiKey" },
          note: "Atenção: a chave fica em texto no localStorage, como qualquer dado guardado ali: quem tiver acesso a este navegador consegue lê-la. Em outro computador, é preciso colar de novo.",
        },
        {
          id: "invalid",
          title: "Se a chave não vale",
          text: "Se o teste falhar, o catch mostra a mensagem de erro com o motivo e nada é guardado. O finally desliga o loading nos dois casos.",
          code: { file: "src/actions/settings/geminikey/index.ts", name: "submit", from: "} catch (err) {", to: "setSaving(false);", after: 1 },
        },
      ],
    },
    {
      id: "route",
      title: "A IA é acionada e escolhe a rota",
      text: "A criação de timelines (ciclo 5) chama o geminiGenerateJSON, que usa a chave da pessoa, se existir, ou o backend. As sugestões da IA (ciclo 6) vão pelo backend e levam a chave da pessoa no corpo do pedido. Clique para ver quem aciona.",
      code: { file: "src/service/IASettings.ts", name: "geminiGenerateJSON" },
      children: [
        {
          id: "bytimeline",
          title: "Acionada pela timeline",
          text: "A criação de timelines monta o prompt com o tema da pessoa e chama o geminiGenerateJSON.",
          code: { file: "src/actions/helpers/timelineai/index.ts", name: "resolveTimelineMovies", from: "const answer = await geminiGenerateJSON", lines: 1 },
        },
        {
          id: "bysuggestion",
          title: "Acionada pelas sugestões",
          text: "As sugestões chamam o backend (/api/suggestions). Se a pessoa tem chave própria, ela vai só no corpo do pedido (HTTPS), nunca na URL; o servidor a usa só naquela chamada, sem registrar nem guardar. Sem chave própria, o servidor usa a da plataforma.",
          code: { file: "src/service/IASettings.ts", name: "callSuggestionsApi", from: "const userKey", to: "body: JSON.stringify" },
        },
        {
          id: "read",
          title: "Lê a chave guardada",
          text: "O getUserGeminiKey procura no localStorage a chave do usuário que está logado. Se não achar (ou o armazenamento estiver bloqueado), devolve vazio e o app usa a chave da plataforma.",
          code: { file: "src/service/IASettings.ts", name: "getUserGeminiKey" },
        },
      ],
    },
    {
      id: "direct",
      title: "Com a chave sua: direto ao Google",
      text: "Na criação de timelines, o navegador chama o Gemini sem passar pelo nosso servidor. Cada chamada tem um limite de tempo e, se o Google falhar por um erro passageiro, tenta de novo e depois com um modelo reserva. O uso passa a contar na conta da pessoa.",
      code: { file: "src/service/IASettings.ts", name: "generateWithUserKey", from: "const callModel", to: "clearTimeout(timeout);", after: 2 },
    },
    {
      id: "backend",
      title: "Sem chave: pelo backend",
      lane: "backend",
      text: "Sem chave própria, o navegador manda o pedido e o token de login para /api/gemini, e o servidor chama o Google com a chave da plataforma, que nunca vai para o navegador.",
      code: { file: "src/service/IASettings.ts", name: "generateViaBackend", from: "const idToken", to: "body: JSON.stringify({ prompt, schema, useSearch })", after: 1 },
    },
    {
      id: "remove",
      title: "Remover a chave",
      text: "O botão Remover apaga a chave do localStorage e limpa o campo. A partir daí, a IA volta para a chave da plataforma.",
      code: { file: "src/actions/settings/geminikey/index.ts", name: "remove" },
    },
  ],
};
