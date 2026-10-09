import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 6: como a "Sugestão da IA" aparece (3 sugestões por dia) e é renovada. Quase tudo acontece no backend. Os trechos de código são lidos do próprio projeto.
// usado em: presentation/cycles
export const SUGGESTIONS_CYCLE: Cycle = {
  id: "suggestions",
  title: "Sugestões da IA",
  intro: "A IA olha o que a pessoa gosta e sugere 3 títulos por dia. O front só faz um pedido ao backend; é ele que escolhe o gosto, guarda as sugestões do dia e chama a IA quando precisa.",
  steps: [
    {
      id: "panel",
      title: "O painel diz o tipo",
      text: "O painel recebe o tipo da página (movie ou tv) e a categoria (séries ou animes) e chama o useDailySuggestions.",
      code: { file: "src/components/organisms/AiSuggestionsPanel/index.tsx", name: "AiSuggestionsPanel", from: "const { slots, basis", lines: 1 },
    },
    {
      id: "request",
      title: "Um pedido ao backend",
      text: "Ao abrir a tela, o hook (useDailySuggestions) faz uma chamada com o login da pessoa e guarda só o resultado, o carregando e o erro. Clique em uma etapa para ver o que o servidor faz.",
      code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: "// Abre a tela", to: "}, [uid, mediaKind, category, attempt]);" },
      children: [
        {
          id: "send",
          title: "O front manda o pedido",
          text: "Vão o tipo, a categoria, o idioma, o fuso da pessoa e os gêneros que ela cadastrou. Pedidos iguais ao mesmo tempo viram um só, para o servidor gerar uma vez. Se a pessoa tem chave própria do Gemini, o callSuggestionsApi a coloca no corpo do pedido (HTTPS), nunca na URL.",
          code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "requestSuggestions" },
        },
        {
          id: "login",
          title: "O servidor confere o login",
          lane: "backend",
          text: "O backend confere o token de login e descobre quem é a pessoa (uid). Sem login, responde 401; pedido fora do formato, 400.",
          code: { file: "api/suggestions.ts", name: "handler", from: "const authHeader", to: 'res.status(400).json({ error: "Pedido inválido." });', after: 2 },
        },
        {
          id: "read",
          title: "Lê o que a pessoa já tem",
          lane: "firebase",
          text: "Lê no Firebase o que ela viu, avaliou e segue. Daqui saem as notas, os títulos e o que conta como \"já assistido\".",
          code: { file: "api/suggestions.ts", name: "readUserData" },
        },
        {
          id: "taste",
          title: "Escolhe a base de gosto",
          lane: "backend",
          text: "Pega até 10 títulos mais bem avaliados do tipo e da categoria da página. Sem notas, usa até 12 títulos recentes vistos ou seguidos. Se não tem nenhum dos dois, o basis fica null.",
          code: { file: "api/suggestions.ts", name: "pickTaste" },
        },
        {
          id: "today",
          title: "Já tem as sugestões de hoje?",
          lane: "firebase",
          text: "Cada pessoa tem um documento por tipo e categoria (movie, tv ou anime) com a data, os 3 lugares e o histórico. Só vale se a data for a de hoje no fuso dela. Se vale e ninguém pediu refresh, é só devolver, sem chamar a IA.",
          code: { file: "api/suggestions.ts", name: "handler", from: "// Um documento por usuário", to: "saved.day === today ? saved : null;" },
        },
        {
          id: "free",
          title: "Libera o que foi assistido",
          lane: "backend",
          text: "Filme visto ou série seguida deixa o lugar vazio (null), sem gerar outro no lugar. O refresh é que preenche.",
          code: { file: "api/suggestions.ts", name: "handler", from: "// O que a pessoa já assistiu", to: "const mustGenerate" },
        },
        {
          id: "notaste",
          title: "Sem gosto, sem sugestão",
          lane: "backend",
          text: "Se precisa gerar mas não há base de gosto, responde status no-taste e não chama a IA. O painel mostra o aviso.",
          code: { file: "api/suggestions.ts", name: "handler", from: "if (mustGenerate && !basis)", to: "return;", after: 1 },
        },
        {
          id: "prompt",
          title: "Monta o pedido à IA",
          lane: "backend",
          text: "O pedido diz o gosto (títulos e notas, ou só os vistos) e os gêneros da pessoa, e pede 5 a mais do que falta para sobrar depois dos filtros. O kindWord troca a palavra: filmes, séries ou animes.",
          code: { file: "api/suggestions.ts", name: "buildPrompt" },
        },
        {
          id: "ai",
          title: "Escolhe a chave e chama a IA",
          lane: "backend",
          text: "Se veio a chave própria da pessoa, ela é usada só nesta chamada (no cabeçalho, nunca na URL, e não é guardada nem registrada nos logs). Sem chave própria, o servidor usa a da plataforma.",
          code: { file: "api/suggestions.ts", name: "handler", from: "const userKey", to: "return;", after: 2 },
        },
        {
          id: "gemini",
          title: "O servidor chama o Gemini",
          lane: "backend",
          text: "Erro passageiro (500 ou 503): espera e tenta de novo; se continuar, ou se a cota acabar (429), tenta um modelo reserva. Cota esgotada volta como 429 e chave recusada como erro claro, para a tela mostrar a mensagem certa.",
          code: { file: "api/_lib/geminiServer.ts", name: "generateJSON" },
        },
        {
          id: "tmdb",
          title: "TMDb, filtros e onde assistir",
          lane: "backend",
          text: "Cada nome sugerido é procurado no TMDb para ter o id e o pôster reais (o que não achar, ou for de outra categoria, é descartado). Tira os repetidos e os que a pessoa já tem ou já recebeu hoje, fica com a quantidade que falta e consulta onde assistir.",
          code: { file: "api/suggestions.ts", name: "generate", from: "const found = await Promise.all", to: "return withAvailability" },
        },
        {
          id: "save",
          title: "Guarda e responde",
          lane: "firebase",
          text: "Os novos entram nos lugares vazios, o histórico cresce e o documento do dia é salvo. A resposta tem o status, o basis e os 3 lugares, com os cards prontos.",
          code: { file: "api/suggestions.ts", name: "handler", from: "const queue = [...created];", to: 'res.status(200).json({ status: "ok"' },
        },
        {
          id: "error",
          title: "Se der erro",
          text: "A mensagem do servidor chega ao front, o erro vai para o console e o painel mostra o aviso. Se for cota esgotada (429), o botão de tentar de novo não aparece.",
          code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: ".catch((err) => {", to: "setQuotaHit(isQuotaError(err));", after: 1 },
        },
      ],
    },
    {
      id: "states",
      title: "Vazio, carregando ou erro",
      text: "Enquanto não há sugestões, o painel mostra uma das mensagens: sem base de gosto (vazio), \"gerando\" (loading) ou erro. Com erro, aparece o botão de tentar de novo, a não ser que a causa seja a cota.",
      code: { file: "src/components/organisms/AiSuggestionsPanel/index.tsx", name: "AiSuggestionsPanel", from: "{noTaste &&", lines: 12 },
    },
    {
      id: "cards",
      title: "Os 3 cards aparecem",
      text: "Com os lugares prontos, o painel mostra um card para cada um. Um lugar vazio (null) vira o botão de renovar. Se renovar falhar, a mensagem aparece embaixo.",
      code: { file: "src/components/organisms/AiSuggestionsPanel/index.tsx", name: "AiSuggestionsPanel", from: "{hasSlots && (", to: "</>", after: 1 },
    },
    {
      id: "watched",
      title: "Quando a pessoa assiste",
      text: "Se uma sugestão passa a ser filme visto ou série seguida (isChecked), o card vira o botão de renovar na hora, sem esperar o backend nem chamar a IA.",
      code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: "// O que acabou de ser assistido", lines: 2 },
    },
    {
      id: "refresh",
      title: "Pedir novas sugestões",
      text: "Ao clicar no botão de renovar, o front faz o mesmo pedido, agora com action refresh, e troca tudo pela resposta. Clique em uma etapa para ver o que o servidor faz.",
      code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "refresh" },
      children: [
        {
          id: "refresh-count",
          title: "Conta os lugares livres",
          lane: "backend",
          text: "O backend conta os lugares vazios e só gera essa quantidade. Se não há nenhum livre, devolve o que já tem, sem chamar a IA.",
          code: { file: "api/suggestions.ts", name: "handler", from: "const empty =", to: "const mustGenerate" },
        },
        {
          id: "refresh-new",
          title: "Gera sem repetir",
          lane: "backend",
          text: "Fica de fora tudo que a pessoa viu, avaliou ou segue e tudo que já foi sugerido hoje (o histórico). Se depois dos filtros ainda faltar sugestão, pede de novo à IA (até 3 vezes), dizendo o que já foi tentado. Depois segue o mesmo caminho: TMDb, disponibilidade e salvar.",
          code: { file: "api/suggestions.ts", name: "handler", from: "const current: Daily", to: "exclude.add(", after: 2 },
        },
      ],
    },
  ],
};
