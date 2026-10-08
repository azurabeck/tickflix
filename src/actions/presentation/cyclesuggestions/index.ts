import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 6: como a "Sugestão da IA" aparece (3 sugestões por dia) e é renovada. Os trechos de código são lidos do próprio projeto.
// usado em: presentation/cycles
export const SUGGESTIONS_CYCLE: Cycle = {
  id: "suggestions",
  title: "Sugestões da IA",
  intro: "A IA olha o que a pessoa gosta e sugere 3 títulos por dia. A lista fica guardada no navegador, e o que ela assiste vira um botão para pedir novas sugestões.",
  steps: [
    {
      id: "panel",
      title: "O painel pede as sugestões",
      text: "O painel chama o useDailySuggestions com o tipo da página: Filmes manda movie; Séries e Animes mandam tv, e em Animes vai também a categoria. Ele recebe as chaves do que a pessoa viu ou segue e o filtro de categoria vindos do rank de notas.",
      code: { file: "src/components/organisms/AiSuggestionsPanel/index.tsx", name: "AiSuggestionsPanel", from: "const { daily, basis", lines: 1 },
    },
    {
      id: "taste",
      title: "Define o gosto da pessoa",
      text: "A base do gosto são as maiores notas que ela deu (até 10), só do tipo da página. Se não deu nota, usa os últimos títulos que viu ou segue (até 12). Se não tem nenhum dos dois, não há o que sugerir e o painel mostra um aviso.",
      code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: "const ratedKeys", to: "const ready" },
    },
    {
      id: "today",
      title: "Já tem as sugestões de hoje?",
      text: "Ao abrir, o hook procura no localStorage as sugestões guardadas. Só valem se a data for a de hoje. Se valem, o painel já mostra os cards, sem chamar a IA.",
      code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: "const [daily, setDaily]", lines: 5 },
    },
    {
      id: "generate",
      title: "Gera quando falta",
      text: "Se não há sugestões de hoje, mas há base de gosto, a pessoa está logada e os títulos dela já foram lidos, o hook pede sugestões. Liga o loading, pede e confere se veio algo. Se a IA falhou há pouco (cota esgotada), nem tenta. Clique em uma etapa do pedido.",
      code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: "if (daily || !basis", to: "A IA não devolveu nenhuma sugestão válida." },
      children: [
        {
          id: "prompt",
          title: "Monta o pedido",
          text: "O pedido diz o gosto (títulos e notas, ou só os vistos) e os gêneros que a pessoa cadastrou, e pede 8 títulos para sobrar depois dos filtros. O kindWord troca a palavra: filmes, séries ou animes. É aqui que Séries e Animes se diferenciam.",
          code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "fetchAiSuggestions", from: "const kindWord", to: "const raw = await geminiGenerateJSON<RawSuggestion[]>(prompt, SUGGESTIONS_SCHEMA);" },
        },
        {
          id: "ai",
          title: "Chama a IA",
          text: "É a mesma porta do ciclo anterior: o geminiGenerateJSON usa a chave da própria pessoa, se ela cadastrou, ou passa pelo backend. A IA devolve só título, ano e tipo.",
          code: { file: "src/service/IASettings.ts", name: "geminiGenerateJSON" },
        },
        {
          id: "tmdb",
          title: "O TMDb confirma cada título",
          text: "Cada nome sugerido é procurado no TMDb para ter o id e o pôster reais. O que não for encontrado é descartado, e um erro em um título não derruba os outros.",
          code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "fetchAiSuggestions", from: "const resolved = await Promise.all(", lines: 12 },
        },
        {
          id: "filter",
          title: "Filtra e vê onde assistir",
          text: "Tira os repetidos, os de outro tipo e os que a pessoa já viu ou avaliou (ao renovar, também os já sugeridos hoje), e fica com os 3 primeiros. Depois faz uma única consulta para saber quais dá para assistir.",
          code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "fetchAiSuggestions", from: "const seen = new Set<string>();", to: "available: availability.has" },
        },
        {
          id: "save",
          title: "Guarda por hoje",
          text: "O save põe as 3 sugestões no estado e no localStorage, com a data de hoje. Também guarda o histórico (history) do que já foi sugerido, para não repetir depois.",
          code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: "save({", to: "});" },
        },
        {
          id: "error",
          title: "Se der erro",
          text: "O erro vai para o console e o painel mostra a mensagem. Se for cota esgotada (429) ou chave do servidor recusada, o blockForAWhile guarda isso na sessão por 30 minutos, para não gastar cota nem encher o console. O botão \"Tentar de novo\" ignora essa espera.",
          code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: 'console.error("Erro ao gerar sugestões da IA:", err);', lines: 6 },
        },
      ],
    },
    {
      id: "states",
      title: "Vazio, carregando ou erro",
      text: "Enquanto não há sugestões, o painel mostra uma das mensagens: sem base de gosto (vazio), \"gerando\" (loading) ou erro. Com erro, aparece o botão de tentar de novo, a não ser que a causa seja a cota.",
      code: { file: "src/components/organisms/AiSuggestionsPanel/index.tsx", name: "AiSuggestionsPanel", from: "{showEmptyHint", lines: 12 },
    },
    {
      id: "cards",
      title: "Os 3 cards aparecem",
      text: "Com as sugestões prontas, o painel mostra um card para cada lugar (slot). Um lugar vazio (null) vira o botão de renovar. Se renovar falhar, a mensagem aparece embaixo.",
      code: { file: "src/components/organisms/AiSuggestionsPanel/index.tsx", name: "AiSuggestionsPanel", from: "{daily && (", to: "</>", after: 1 },
    },
    {
      id: "watched",
      title: "Quando a pessoa assiste",
      text: "Se uma sugestão passa a ser filme visto ou série seguida (isChecked), o lugar dela vira null e o card vira o botão de renovar. Isso não chama a IA: só atualiza o que está guardado.",
      code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "useDailySuggestions", from: "// Assistiu (filme visto", to: "}, [daily, checkedMap]);" },
    },
    {
      id: "refresh",
      title: "Pedir novas sugestões",
      text: "Ao clicar no botão de renovar, o refresh conta quantos lugares estão vazios e pede de uma vez só essa quantidade, sem repetir o que já foi sugerido hoje. Os novos entram nos lugares vazios e o resultado é guardado de novo.",
      code: { file: "src/actions/helpers/aisuggestion/index.ts", name: "refresh" },
    },
  ],
};
