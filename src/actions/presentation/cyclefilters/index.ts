import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 4: como os filtros das sections funcionam. O exemplo principal é a tela de Filmes ("Principais lançamentos", filtro por mês);
// a última etapa mostra onde o fluxo muda nas telas de Séries e Animes. Os trechos de código são lidos do próprio projeto.
// usado em: presentation/cycles
export const FILTERS_CYCLE: Cycle = {
  id: "filters",
  title: "Filtros das sections de séries e filmes",
  intro: "Filtrar não chama o backend de novo. A section já tem a lista inteira e só escolhe, no navegador, o pedaço que vai aparecer.",
  steps: [
    {
      id: "data",
      title: "A section recebe a lista inteira",
      text: "Na tela de Filmes, o dashboard entrega todos os principais lançamentos dos últimos 12 meses (até 120 filmes). A MajorReleasesSection recebe tudo isso em movies. O filtro vai acontecer em cima dessa lista.",
      code: { file: "src/pages/private/home/index.tsx", name: "Home", from: "<MajorReleasesSection", lines: 1 },
    },
    {
      id: "months",
      title: "Descobre os meses que existem",
      text: "O releaseMonths pega o mês (AAAA-MM) da data de cada lançamento, tira os repetidos, ordena do mais recente para o mais antigo e fica com os 5 primeiros. Cada mês vai virar um chip.",
      code: { file: "src/actions/movies/majorreleases/index.ts", name: "releaseMonths" },
    },
    {
      id: "active",
      title: "Escolhe o mês ativo",
      text: "O mês escolhido (chosenMonth) começa vazio. Enquanto ninguém escolhe, vale o primeiro mês da lista, o mais recente. Se o mês escolhido deixar de existir na lista, também volta para o primeiro.",
      code: { file: "src/components/organisms/MajorReleasesSection/index.tsx", name: "MajorReleasesSection", from: "const months = useMemo", lines: 4 },
    },
    {
      id: "filter",
      title: "Filtra os filmes do mês",
      text: "O releasesOfMonth fica só com os filmes cujo mês de lançamento é o ativo e corta em 20 (o tamanho de uma fileira). O resultado (visible) só é recalculado quando a lista ou o mês mudam.",
      code: { file: "src/actions/movies/majorreleases/index.ts", name: "releasesOfMonth" },
    },
    {
      id: "chips",
      title: "Os chips aparecem na tela",
      text: "A barra de filtros tem um chip por mês, com o nome em texto (por exemplo, \"Outubro de 2026\"). O mês ativo fica marcado. Se não houver nenhum mês, a barra nem aparece.",
      code: { file: "src/components/organisms/MajorReleasesSection/index.tsx", name: "MajorReleasesSection", from: "toolbar={", lines: 5 },
    },
    {
      id: "click",
      title: "Clicar num chip troca o filtro",
      text: "Cada chip é um botão. Ao clicar, o FilterChips chama onToggle com o valor do chip, que aqui é setChosenMonth. O estado muda, e o fluxo volta para a etapa 3: o mês ativo muda e a lista é filtrada de novo.",
      code: { file: "src/components/atoms/FilterChips/index.tsx", name: "FilterChips" },
    },
    {
      id: "rail",
      title: "A fileira mostra a lista filtrada",
      text: "O MediaRailSection recebe só os filmes do mês (visible), junto com o loading e o erro vindos do dashboard. O filtro não mexe nesses dois: se a lista ainda está carregando, aparece \"carregando\", não os chips.",
      code: { file: "src/components/organisms/MajorReleasesSection/index.tsx", name: "MajorReleasesSection", from: "<MediaRailSection", lines: 5 },
    },
    {
      id: "series",
      title: "Em Séries e Animes o filtro é outro",
      lane: "series",
      text: "Em Minhas séries e Meus animes os filtros são de progresso, e a lista vem do Firebase (o que a pessoa segue). Diferente dos meses, aqui dá para ligar vários filtros ao mesmo tempo. Clique em uma das partes.",
      code: { file: "src/components/organisms/SeriesRailSection/index.tsx", name: "SeriesRailSection", from: "const [filters, setFilters]", to: "const filtering" },
      children: [
        {
          id: "toggle",
          title: "Vários filtros ligados",
          lane: "series",
          text: "O estado filters é uma lista. Começa só com \"Em progresso\". Clicar num chip liga ou desliga aquele filtro, sem mexer nos outros.",
          code: { file: "src/components/organisms/SeriesRailSection/index.tsx", name: "toggleFilter" },
        },
        {
          id: "group",
          title: "Em que grupo cada série cai",
          lane: "series",
          text: "O progressGroup coloca cada série seguida em um único grupo: Concluídos, Em breve, Não iniciado ou Em progresso. Os grupos não se misturam, então cada série aparece em só um deles.",
          code: { file: "src/actions/helpers/progress/index.ts", name: "progressGroup" },
        },
        {
          id: "apply",
          title: "Aplica o filtro",
          lane: "series",
          text: "Para cada série da lista, o matches busca o registro dela em followed e vê se o grupo dela está entre os filtros ligados. Só as que combinam seguem para a fileira.",
          code: { file: "src/components/organisms/SeriesRailSection/index.tsx", name: "SeriesRailSection", from: "const matches", to: "const items = allItems && filtering" },
        },
        {
          id: "empty",
          title: "Quando nada combina",
          lane: "series",
          text: "Se a pessoa segue séries, mas nenhuma cai nos filtros ligados, aparece uma mensagem própria (followFilter.empty) em vez da mensagem de lista vazia.",
          code: { file: "src/components/organisms/SeriesRailSection/index.tsx", name: "SeriesRailSection", from: "const emptyText", lines: 1 },
        },
      ],
    },
  ],
};
