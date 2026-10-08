import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 5: como uma timeline é criada a partir de um texto, com a ajuda da IA. Os trechos de código são lidos do próprio projeto.
// usado em: presentation/cycles
export const TIMELINEAI_CYCLE: Cycle = {
  id: "timelineai",
  title: "Criação de timelines com IA",
  intro: "A pessoa descreve uma timeline em uma frase. A IA entende o pedido, o TMDb confirma os títulos, a pessoa ajusta conversando e então salva.",
  steps: [
    {
      id: "type",
      title: "Digita o tema",
      text: "Na faixa \"Criar uma nova timeline\", a pessoa escreve o tema (por exemplo, \"filmes do Nolan\") e aperta Enter ou o botão. O modal só abre se estiver logada e o texto não estiver vazio.",
      code: { file: "src/components/organisms/CreateTimelinePanel/index.tsx", name: "handleOpenModal" },
    },
    {
      id: "modal",
      title: "O modal liga o hook",
      text: "O modal recebe o tema e chama o useTimelineChat. Todo o ciclo mora nesse hook: o modal só mostra o que ele devolve (a conversa, a lista, o loading e os erros).",
      code: { file: "src/components/organisms/CreateTimelineModal/index.tsx", name: "CreateTimelineModal", from: "const { turns, draft", lines: 1 },
    },
    {
      id: "first",
      title: "A primeira busca",
      text: "Assim que o modal abre, o hook chama o resolveTimelineMovies. Enquanto espera, o loading fica ligado. Se der certo, guarda a lista (draft). Se der erro, a mensagem aparece na conversa. O finally desliga o loading nos dois casos.",
      code: { file: "src/actions/helpers/createtimeline/index.ts", name: "useTimelineChat", from: "// 1. primeira resolução", to: "}, []);" },
    },
    {
      id: "resolve",
      title: "A IA e o TMDb montam a lista",
      text: "O resolveTimelineMovies transforma o texto em uma lista de títulos reais, em etapas: a IA traduz o texto em filtros, o código escolhe como buscar e o TMDb confirma cada título. Se no fim a lista estiver vazia, dá o erro \"Não encontramos nenhum título pra esse tema\". Clique em uma etapa.",
      code: { file: "src/actions/helpers/timelineai/index.ts", name: "resolveTimelineMovies", from: "const genreMaps", to: "movies = await resolveByAiSearch", after: 1 },
      children: [
        {
          id: "filters",
          title: "A IA traduz o texto em filtros",
          text: "O texto vai para a IA, que não lista filme nenhum: ela só preenche estes campos (pessoa, franquia, gênero, anos, premiação...). Quem busca de verdade vem depois. A resposta tem que seguir este esquema. Clique para ver como o pedido chega na IA.",
          code: { file: "src/actions/helpers/timelineai/index.ts", name: "THEME_FILTERS_SCHEMA" },
          children: [
            {
              id: "route",
              title: "Escolhe a rota",
              text: "O geminiGenerateJSON é a porta de entrada da IA. Se a pessoa cadastrou a própria chave do Gemini (em Configurações), chama o Google direto do navegador. Se não, passa pelo backend.",
              code: { file: "src/service/IASettings.ts", name: "geminiGenerateJSON" },
            },
            {
              id: "viabackend",
              title: "Sem chave: pelo backend",
              lane: "backend",
              text: "O navegador pega o token de login do Firebase e manda o pedido para /api/gemini. A chave da plataforma fica só no servidor e nunca vai para o navegador. Sem login, o erro é \"Faça login pra usar a IA\".",
              code: { file: "src/service/IASettings.ts", name: "generateViaBackend", from: "const idToken", to: "body: JSON.stringify({ prompt, schema, useSearch })", after: 1 },
            },
            {
              id: "login",
              title: "O servidor confere o login",
              lane: "backend",
              text: "Antes de gastar a IA, o servidor confere o token (verifyIdToken). Sem token, ou com token inválido, responde 401 e o pedido para por aí.",
              code: { file: "api/gemini.ts", name: "handler", from: "const authHeader", lines: 12 },
            },
            {
              id: "gemini",
              title: "O servidor chama o Gemini",
              lane: "backend",
              text: "Com a chave da plataforma, chama o Gemini. Se der erro passageiro (500 ou 503), espera e tenta de novo; se continuar, ou se a cota acabar (429), tenta um modelo reserva. A resposta volta como texto JSON.",
              code: { file: "api/gemini.ts", name: "handler", from: "let response = await callGemini", to: "res.status(200).json({ text });" },
            },
            {
              id: "userkey",
              title: "Com chave sua: direto do navegador",
              text: "Com a chave da própria pessoa, o navegador chama o Google sem passar pelo backend, com a mesma regra de tentar de novo e usar o modelo reserva.",
              code: { file: "src/service/IASettings.ts", name: "generateWithUserKey", from: "// Erro transitório", to: "response = await callModel(GEMINI_FALLBACK_MODEL);", after: 1 },
            },
          ],
        },
        {
          id: "lock",
          title: "Séries e animes travam o tipo",
          lane: "series",
          text: "As páginas Séries e Animes passam categoryLock. Então a lista só pode ter séries (mediaTypes = tv) e, em Animes, ainda entram o gênero Animação e o país Japão (JP). Na página Filmes não há trava.",
          code: { file: "src/actions/helpers/timelineai/index.ts", name: "resolveTimelineMovies", from: "const isTvLocked", to: "filters.originCountry = \"JP\";", after: 1 },
        },
        {
          id: "chain",
          title: "Escolhe como montar a lista",
          text: "Depende do que a IA identificou: premiação (vencedores da premiação), pessoa (filmografia no TMDb) ou franquia (coleção no TMDb, só fora de séries). Se nada disso serve, ou a lista veio vazia, cai na busca por IA. Os três primeiros caminhos têm funções próprias, que não detalhamos aqui.",
          code: { file: "src/actions/helpers/timelineai/index.ts", name: "resolveTimelineMovies", from: "let movies: TimelineMovie[] | null = null;", to: "movies = await resolveByAiSearch", after: 1 },
        },
        {
          id: "search",
          title: "Busca por IA e confirma no TMDb",
          text: "A IA pesquisa no Google e devolve nomes e anos. O código procura cada nome no TMDb (searchTmdbTitle) para ter o id e o pôster de verdade, descarta o que não achou e tira os repetidos. Só entram títulos que existem no TMDb.",
          code: { file: "src/actions/helpers/timelineai/index.ts", name: "resolveByAiSearch", from: "const items = await geminiGenerateJSON<AiSearchItem[]>", to: "return Array.from(byKey.values());" },
        },
      ],
    },
    {
      id: "chat",
      title: "Ajustar conversando",
      text: "A pessoa pode escrever ajustes (por exemplo, \"só os 5 melhores\"). O send manda a mensagem para a IA (respondToTimelineChat), que responde e diz se é um pedido de mudança. Se for, a busca roda de novo com o pedido original e todos os ajustes; se for só uma pergunta, só responde. Loading e erro funcionam como na primeira busca.",
      code: { file: "src/actions/helpers/createtimeline/index.ts", name: "send" },
    },
    {
      id: "save",
      title: "Salvar",
      text: "O botão Salvar só funciona com a lista pronta e sem outro salvamento em andamento. Liga o saving, grava e, se der certo, avisa que salvou (onSaved). Se falhar, aparece a mensagem de erro de salvar. Clique para ver onde grava.",
      code: { file: "src/actions/helpers/createtimeline/index.ts", name: "save" },
      children: [
        {
          id: "write",
          title: "Grava no Firebase",
          lane: "firebase",
          text: "O createTimeline cria o documento em users/<uid>/timeline com o nome, os tipos e os títulos. Como é salvo com followed: true, a timeline já nasce seguida.",
          code: { file: "src/actions/helpers/timelines/index.ts", name: "createTimeline" },
        },
      ],
    },
    {
      id: "close",
      title: "O modal fecha",
      text: "O onSaved fecha o modal e limpa o texto da faixa.",
      code: { file: "src/components/organisms/CreateTimelinePanel/index.tsx", name: "handleSaved" },
      note: "Atenção: as páginas não passam o onCreated para a faixa, então nada recarrega a lista \"Timelines que você segue\" depois de salvar. A nova timeline só aparece quando a página é aberta de novo. É o comportamento atual do código.",
    },
  ],
};
