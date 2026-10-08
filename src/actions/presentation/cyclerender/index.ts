import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 1: como a tela de Filmes (rota `/`) mostra as listas. Os trechos de código são lidos do próprio projeto, então são sempre os reais.
// A trilha tem as etapas principais; o que está dentro de uma etapa (children) só aparece quando ela é escolhida.
// usado em: presentation/cycles
export const RENDER_CYCLE: Cycle = {
  id: "render",
  title: "Renderização dos dados",
  intro: "A tela de Filmes mostra cada lista em poucos passos: a página dá a partida, o dashboard busca os dados e cada section desenha a sua parte.",
  steps: [
    {
      id: "start",
      title: "A página dá a partida",
      text: "A página Filmes começa chamando o useMoviesDashboard. É essa linha que inicia tudo: o resultado (dashboard) é entregue para cada section. Hook é uma função do React que guarda estado e busca dados.",
      code: { file: "src/pages/private/home/index.tsx", name: "Home", from: "const dashboard = useMoviesDashboard();", to: "const releases = useMajorReleases(dashboard);" },
    },
    {
      id: "config",
      title: "Configura o dashboard",
      text: "O useMoviesDashboard só diz o que a página precisa: quais sections existem, em que grupos elas são pedidas (o topo sai sozinho porque é rápido) e que a página depende da cidade.",
      code: { file: "src/actions/movies/dashboard/index.ts", name: "useMoviesDashboard" },
    },
    {
      id: "three",
      title: "O dashboard faz 3 coisas",
      text: "O usePageDashboard resolve três coisas: descobre a cidade, busca os dados públicos no backend (TMDb) e lê os dados da pessoa no Firebase. Clique em uma delas para ver o que acontece.",
      code: { file: "src/actions/helpers/section/index.ts", name: "usePageDashboard" },
      children: [
        {
          id: "city",
          title: "Descobre a cidade",
          text: "A section Em cartaz depende da cidade. Ela começa com a última cidade lembrada (ou Brasil) para não esperar. Só se o GPS trouxer outra cidade é que a página busca de novo.",
          code: { file: "src/actions/helpers/pagebackend/index.ts", name: "useCity" },
        },
        {
          id: "backend",
          title: "Backend (TMDb)",
          lane: "backend",
          text: "Os dados públicos (em cartaz, bilheteria, lançamentos) vêm do backend. Para cada grupo de sections, o código olha primeiro o cache e só pede ao backend o que faltar.",
          code: { file: "src/actions/helpers/pagebackend/index.ts", name: "usePageBackend", from: "const forceRefresh = refresh", to: "}, [slot]);", before: 1 },
          children: [
            {
              id: "cache",
              title: "Cache do navegador",
              lane: "backend",
              text: "O localStorage guarda cada grupo por 7 dias. Se ele está lá, inteiro, e ninguém pediu para atualizar, a section aparece na hora, sem nenhuma chamada.",
              code: { file: "src/actions/helpers/pagebackend/index.ts", name: "readGroupCache" },
            },
            {
              id: "request",
              title: "Pede ao backend",
              lane: "backend",
              text: "O requestGroup liga o loading do grupo e chama o backend com o fetchBackend (um GET em /api/dashboard). Quando a resposta chega, guarda os dados e desliga o loading. Se falhar, marca o grupo com erro.",
              code: { file: "src/actions/helpers/pagebackend/index.ts", name: "usePageBackend", from: "const requestGroup", to: "if (!cancelled()) markGroup(setLoadingGroups, index, false);", after: 2 },
            },
            {
              id: "builders",
              title: "O servidor monta as sections",
              lane: "backend",
              text: "No servidor, o api/dashboard.ts tem um construtor por section (hero, nowplaying, boxoffice, releases). Cada um busca no TMDb e devolve cards prontos: imagem, título, ano e id.",
              code: { file: "api/dashboard.ts", name: "handler", from: "const builders:", until: "const names = Object.keys(builders)" },
            },
            {
              id: "respond",
              title: "Responde uma section por vez",
              lane: "backend",
              text: "Os construtores pedidos rodam juntos (Promise.all). A resposta traz uma entrada por section: { items } ou { error }. Por isso uma section que falha não derruba as outras.",
              code: { file: "api/dashboard.ts", name: "handler", from: "const names = Object.keys(builders)", to: "res.status(200).json(sections);" },
            },
            {
              id: "servercache",
              title: "Cache do servidor",
              lane: "backend",
              text: "Cada section também tem cache compartilhado no Firestore, por 7 dias. A primeira visita busca no TMDb e salva; as outras só leem. Se a busca falhar, devolve null e a section mostra erro.",
              code: { file: "api/_lib/sharedCache.ts", name: "cachedOrFetch" },
            },
          ],
        },
        {
          id: "firebase",
          title: "Firebase (a pessoa)",
          lane: "firebase",
          text: "Os dados da pessoa (timelines, vistos, notas e seguidos) vêm direto do Firebase, no navegador. Esta parte tem loading próprio, separado do backend.",
          code: { file: "src/actions/helpers/pagefirebase/index.ts", name: "usePageFirebase" },
          children: [
            {
              id: "timelines",
              title: "Timelines que você segue",
              lane: "firebase",
              text: "Busca as suas timelines no Firestore e fica só com as que você segue e que são desta página.",
              code: { file: "src/actions/helpers/pagefirebase/index.ts", name: "useFollowedTimelines" },
            },
            {
              id: "records",
              title: "Vistos, notas e seguidos",
              lane: "firebase",
              text: "Quando a pessoa entra no app, o MediaCardsProvider lê uma vez só o que ela já viu, avaliou e segue. Últimos vistos e Seu Rank de Notas usam esses dados, sem fazer outra chamada.",
              code: { file: "src/contexts/MediaCards/index.tsx", name: "MediaCardsProvider", from: "// 1. busca o que o usuário já viu", to: "}, [uid, loadFollowed]);" },
            },
          ],
        },
      ],
    },
    {
      id: "slice",
      title: "Cada section pega a sua fatia",
      text: "dashboard.section(\"nowplaying\") devolve só o pedaço daquela section: { items, loading, error }. O loading é do grupo dela, então uma section não fica esperando pela outra.",
      code: { file: "src/actions/helpers/pagebackend/index.ts", name: "usePageBackend", from: "// A fatia de uma section", to: "return { city, section };" },
    },
    {
      id: "nowplaying",
      title: "A section prepara o que mostra",
      text: "O useNowPlaying pega a fatia e monta o título (com o nome da cidade). É a única coisa que é só de Em cartaz: o resto é igual em todas as sections.",
      code: { file: "src/actions/movies/nowplaying/index.ts", name: "useNowPlaying" },
    },
    {
      id: "rail",
      title: "O componente desenha",
      text: "O MediaRailSection recebe items, loading e error e só desenha a fileira de cards. Ele não sabe de onde os dados vieram.",
      code: { file: "src/components/organisms/MediaRailSection/index.tsx", name: "MediaRailSection", from: "return (", to: "</HomeSection>" },
    },
    {
      id: "state",
      title: "Carregando, erro ou cards",
      text: "O HomeSection escolhe o que aparece: se está carregando, mostra \"carregando\"; se deu erro, a mensagem; senão, os cards. Por isso cada section surge assim que os seus dados chegam.",
      code: { file: "src/components/atoms/HomeSection/index.tsx", name: "HomeSection", from: "{loading && <StatusMessage", lines: 3 },
    },
  ],
};
