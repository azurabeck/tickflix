import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 7: como o progresso de uma timeline (quantos títulos já foram vistos) é contado e aparece na tela. Os trechos de código são lidos do próprio projeto.
// usado em: presentation/cycles
export const PROGRESS_CYCLE: Cycle = {
  id: "progress",
  title: "Progressão de timeline",
  intro: "A timeline só guarda a lista de títulos. O progresso não é gravado em lugar nenhum: ele é calculado na hora, comparando a lista com o que a pessoa já viu ou segue.",
  steps: [
    {
      id: "list",
      title: "A timeline guarda só a lista",
      text: "Cada título da timeline tem id, tipo (filme ou série), nome, ano e pôster. A timeline não sabe se a pessoa viu o título: quem sabe isso é o resto do app.",
      code: { file: "src/actions/helpers/timelines/index.ts", name: "TimelineMovie" },
      note: "Atenção: o tipo tem os campos watched e watchedAt, mas eles são criados sempre como false e null e nunca são atualizados. O progresso não usa esses campos. É o comportamento atual do código.",
    },
    {
      id: "checked",
      title: "O que conta como visto",
      lane: "series",
      text: "O checkedMap junta duas coisas: os filmes que a pessoa marcou como vistos e as séries e animes que ela segue. É esse mapa que diz se um título da timeline está feito.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "checkedMap" },
      note: "Atenção: uma série ou anime seguido conta como visto, mesmo que nenhum episódio tenha sido marcado. É o comportamento atual do código.",
    },
    {
      id: "followed",
      title: "A faixa busca as timelines",
      lane: "firebase",
      text: "A faixa \"Timelines que você segue\" lê as timelines no Firebase e fica só com as que a pessoa segue e que são do tipo da página (filmes, séries ou animes). Isso acontece uma vez, ao abrir a página.",
      code: { file: "src/actions/helpers/pagefirebase/index.ts", name: "useFollowedTimelines" },
      note: "Atenção: o hook tem um loading, mas a faixa não o mostra: ela só aparece quando existe pelo menos uma timeline. Se a leitura falhar, o erro vai só para o console.",
    },
    {
      id: "count",
      title: "A faixa conta o progresso",
      text: "Para cada timeline, a faixa conta quantos títulos já foram vistos e calcula a porcentagem. Clique em uma das partes.",
      code: { file: "src/components/organisms/FollowedTimelinesRow/index.tsx", name: "FollowedTimelinesRow", from: "const { watched, total }", lines: 2 },
      children: [
        {
          id: "watched",
          title: "Conta os vistos",
          text: "O timelineProgress percorre os títulos da timeline e conta quantos estão no mapa de vistos. O total é o tamanho da lista.",
          code: { file: "src/actions/helpers/timelines/index.ts", name: "timelineProgress" },
        },
        {
          id: "percent",
          title: "Calcula a porcentagem",
          text: "O progressPercent divide vistos por total e arredonda. Se a timeline estiver vazia, o resultado é 0, para não dividir por zero.",
          code: { file: "src/actions/helpers/timelines/index.ts", name: "progressPercent" },
        },
        {
          id: "bar",
          title: "Desenha a barra",
          text: "A barra do card tem a largura igual à porcentagem, e abaixo dela fica o texto \"visto: 3/8\" (vistos e total).",
          code: { file: "src/components/organisms/FollowedTimelinesRow/index.tsx", name: "FollowedTimelinesRow", from: 'className="followed-timelines__card-progress"', lines: 4 },
        },
      ],
    },
    {
      id: "open",
      title: "Clicar abre a timeline",
      text: "Cada card da faixa é um botão. Ao clicar, a página guarda aquela timeline como escolhida e abre o detalhe dela.",
      code: { file: "src/components/organisms/FollowedTimelinesRow/index.tsx", name: "FollowedTimelinesRow", from: "<button key={timeline.id}", lines: 1 },
    },
    {
      id: "summary",
      title: "O detalhe conta de novo",
      text: "O detalhe da timeline usa o timelineWatchedSummary: conta os vistos no mesmo mapa e devolve também a porcentagem. É a mesma ideia da faixa, e o texto \"visto: X/Y (Z%)\" aparece no topo.",
      code: { file: "src/actions/helpers/timelinedetail/index.ts", name: "timelineWatchedSummary" },
    },
    {
      id: "live",
      title: "Marcar um título move a barra",
      text: "O detalhe e a faixa leem o mesmo contexto. Quando a pessoa marca um filme ou segue uma série (ciclos 2 e 3), o checkedMap muda e tudo é recalculado na hora. Não existe nada para gravar nem recarregar: o progresso é sempre calculado.",
      code: { file: "src/components/organisms/TimelineDetail/index.tsx", name: "TimelineDetail", from: "const media = useMediaCards();", lines: 4 },
    },
  ],
};
