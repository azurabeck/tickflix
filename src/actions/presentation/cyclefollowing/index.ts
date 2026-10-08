import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 3: o que acontece quando alguém começa a seguir (ou deixa de seguir) uma série ou anime. Os trechos de código são lidos do próprio projeto.
// Diferente do filme (ciclo 2), aqui a tela só muda depois que a gravação termina.
// usado em: presentation/cycles
export const FOLLOWING_CYCLE: Cycle = {
  id: "following",
  title: "Marcação de séries e animes como following",
  intro: "Em série e anime, o check significa seguir. O app busca as temporadas e os episódios, grava no Firebase e só então a lista de seguidos muda na tela.",
  steps: [
    {
      id: "click",
      title: "Clique no check do card",
      text: "É o mesmo botão do filme e chama o mesmo media.toggleChecked(item). A diferença é só o texto: no card de série ou anime ele vira \"seguir\" e \"deixar de seguir\".",
      code: { file: "src/components/molecules/MediaCard/index.tsx", name: "MediaCard", from: "const checkLabel", lines: 1 },
    },
    {
      id: "route",
      title: "O contexto escolhe o caminho",
      text: "O toggleChecked olha o tipo do card. Se for \"tv\" (série e anime são os dois \"tv\" no TMDb), vai para o toggleFollow. Filme vai para o ciclo anterior.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleChecked" },
    },
    {
      id: "follow",
      title: "Seguir ou deixar de seguir",
      text: "O toggleFollow decide o que fazer com a série. Ele passa por alguns passos, na ordem do código. Clique em um deles.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleFollow" },
      children: [
        {
          id: "guard",
          title: "Ignora clique duplo",
          text: "Se já existe um pedido em andamento para essa série (pendingIds), o clique é ignorado. Depois olha se a pessoa já segue (current). O resto do caminho depende disso.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleFollow", from: "if (!uid || item.id === undefined", lines: 3 },
        },
        {
          id: "confirm",
          title: "Pede confirmação",
          text: "Se já segue e já marcou algum episódio, abre uma janela perguntando se quer mesmo deixar de seguir, porque o progresso será apagado. Se a pessoa disser não, nada acontece.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleFollow", from: "if (current && followedSeriesProgress", to: "if (!ok) return;", after: 1 },
        },
        {
          id: "unfollow",
          title: "Deixar de seguir",
          lane: "firebase",
          text: "Se já seguia, apaga o registro no Firebase (unfollowSeries), tira a série da lista na tela e fecha o detalhe dela se estiver aberto.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleFollow", from: "if (current) {", to: "} else {" },
        },
        {
          id: "start",
          title: "Começar a seguir",
          text: "Se ainda não seguia, são quatro passos: buscar a série no TMDb, escolher se é série ou anime, gravar no Firebase e recarregar a lista. Clique em um deles.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleFollow", from: "} else {", to: "loadFollowed();", after: 1 },
          children: [
            {
              id: "tmdb",
              title: "Busca temporadas e episódios",
              text: "O fetchSeriesWithEpisodes pergunta ao TMDb pela série e por cada temporada, e monta o registro com todos os episódios ainda não vistos. No fim, ele também descobre se é anime (isAnime).",
              code: { file: "src/actions/helpers/followed/index.ts", name: "fetchSeriesWithEpisodes" },
            },
            {
              id: "category",
              title: "Série ou anime?",
              lane: "series",
              text: "Aqui está a diferença entre os dois. A categoria é a que o card já trazia (item.category, definida pela página Séries ou Animes). Se o card não trouxe, usa o isAnime do TMDb: gênero Animação e produção ou idioma japonês.",
              code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleFollow", from: "const { status, isAnime, seasons }", to: "loadFollowed();" },
            },
            {
              id: "save",
              title: "Grava no Firebase",
              lane: "firebase",
              text: "O followSeries escreve em users/<uid>/following/<id>, com a data em que começou a seguir e o total de temporadas. Se já existir um registro, não faz nada.",
              code: { file: "src/actions/helpers/followed/index.ts", name: "followSeries" },
            },
            {
              id: "reload",
              title: "Recarrega a lista de seguidos",
              lane: "firebase",
              text: "O loadFollowed lê de novo todas as séries seguidas e atualiza a lista do app. Só nesse momento o card aparece marcado. Os registros antigos sem dados de card são completados em segundo plano.",
              code: { file: "src/contexts/MediaCards/index.tsx", name: "loadFollowed" },
            },
          ],
        },
        {
          id: "finish",
          title: "Erro e destravar",
          text: "Se algo falhar (TMDb, Firebase), o erro vai para o console e a lista não muda. De qualquer jeito, o finally libera a série para um novo clique.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleFollow", from: "} catch (err) {", lines: 9 },
          note: "Atenção: neste ciclo não existe loading visual nem aviso de erro para a pessoa. Enquanto salva, o card continua como estava; se falhar, ele só não muda. É o comportamento atual do código.",
        },
      ],
    },
    {
      id: "state",
      title: "O estado é recalculado",
      text: "A lista de seguidos mudou, então o mapa followed (série por id) é refeito. Ele é a fonte para saber quem a pessoa segue.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "followed" },
    },
    {
      id: "card",
      title: "O card aparece marcado",
      text: "O isChecked consulta esse mapa quando o card é uma série (tv): marcado quer dizer que está em followed. Todos os cards usam o mesmo contexto, então se redesenham juntos.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "isChecked" },
    },
    {
      id: "progress",
      title: "O card mostra o progresso",
      text: "Cards de série mostram também quantos episódios foram vistos. O followedSeriesProgress conta os episódios marcados em cada temporada.",
      code: { file: "src/components/molecules/MediaCard/index.tsx", name: "MediaCard", from: "const followed = isSerie", lines: 2 },
    },
    {
      id: "pages",
      title: "Cada página mostra a sua categoria",
      lane: "series",
      text: "Minhas séries mostra só o que tem category igual a \"series\". Em Animes o hook useMyAnimes é igual, mas filtra por \"animes\". É assim que um título seguido aparece só na página certa.",
      code: { file: "src/actions/series/mytvshows/index.ts", name: "useMyTvShows" },
    },
  ],
};
