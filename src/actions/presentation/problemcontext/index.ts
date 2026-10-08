import type { Cycle } from "@/actions/presentation/cycles";

// Problema 3: usar um context para guardar os dados do Firebase. Os trechos de código são lidos do próprio projeto, então são sempre os reais.
// usado em: presentation/cycles
export const CONTEXT_PROBLEM: Cycle = {
  id: "context",
  title: "Context para guardar os dados do Firebase",
  intro: "O que a pessoa viu, avaliou e segue é usado em quase toda a tela. Um único lugar, o MediaCardsProvider, lê esses dados e entrega a todos.",
  problem: {
    why: "Esses dados aparecem em muitos lugares ao mesmo tempo: os cards, Últimos vistos, Seu Rank de Notas, as Sugestões da IA e as timelines. Se cada um lesse o Firebase por conta própria, seriam leituras repetidas e telas mostrando dados diferentes. Marcar um filme em um lugar não atualizaria os outros.",
    what: "Criamos um context: o MediaCardsProvider lê o Firebase uma vez ao entrar no app e guarda tudo em estado. Qualquer componente pega o que precisa com o useMediaCards. As ações (marcar, avaliar, seguir) mudam esse estado e o Firebase, e tudo se atualiza junto.",
  },
  steps: [
    {
      id: "wrap",
      title: "O provedor envolve as páginas",
      text: "O PrivateLayout, que envolve todas as páginas internas, coloca o MediaCardsProvider em volta delas. Por isso o provedor carrega uma vez por sessão, e não a cada página.",
      code: { file: "src/pages/private/PrivateLayout.tsx", name: "PrivateLayout" },
    },
    {
      id: "load",
      title: "Lê o Firebase uma vez",
      lane: "firebase",
      text: "Ao entrar, o provedor lê o que a pessoa viu e avaliou, e depois o que ela segue. Os loadings (watchedLoading e followedLoading) ficam ligados até a leitura terminar, e o finally os desliga mesmo se houver erro. Os registros antigos são completados em segundo plano.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "MediaCardsProvider", from: "// 1. busca o que o usuário já viu", to: "}, [uid, loadFollowed]);" },
      note: "Atenção: é uma leitura única (getDocs), sem escuta em tempo real. Se a pessoa marcar um filme em outra aba ou aparelho, só vê a mudança ao recarregar. É o comportamento atual do código.",
    },
    {
      id: "maps",
      title: "Do estado nascem os mapas",
      text: "Da lista de registros saem os mapas que todo mundo usa: filmes vistos (watchedMap), notas (ratings), dados do card de cada título (titles) e tudo que está marcado (checkedMap, que inclui séries seguidas). Eles são recalculados só quando a lista muda.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "MediaCardsProvider", from: "const watchedMap = useMemo", to: "}, [watchedMap, followedList]);" },
    },
    {
      id: "titles",
      title: "Os dados já vêm prontos para o card",
      lane: "firebase",
      text: "O mapa titles guarda, para cada título, o que o card precisa (nome, ano, imagens, se dá para assistir). Por isso Últimos vistos, o rank e as sugestões desenham os cards sem consultar o TMDb.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "titles" },
    },
    {
      id: "hook",
      title: "Qualquer componente usa o hook",
      text: "O useMediaCards entrega o que está no context. Quem chamar fora do provedor recebe um erro claro. É só chamar o hook e ler o que precisa: não há nada para buscar.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "useMediaCards" },
    },
    {
      id: "actions",
      title: "Dados e ações vão juntos",
      text: "O objeto que o provedor entrega (api) tem os mapas e também as ações: marcar como visto ou seguir (toggleChecked), avaliar (rate), abrir detalhes e tocar trailer. Quem muda algo usa as ações do contexto, e não fala direto com o Firebase.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "api" },
    },
    {
      id: "rerender",
      title: "Mudou aqui, muda em todo lugar",
      text: "Quando uma ação muda o estado, o React redesenha todos os componentes que usam o context. Marcar um filme muda o check do card, entra em Últimos vistos, mexe no progresso das timelines e tira a sugestão da IA, tudo sem recarregar.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "MediaCardsProvider", from: "<MediaCardsContext.Provider value={api}>", lines: 2 },
    },
  ],
};
