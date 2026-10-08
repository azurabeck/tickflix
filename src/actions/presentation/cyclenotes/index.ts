import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 8: como uma nota dada a um filme vira o "Seu Rank de Notas". Os trechos de código são lidos do próprio projeto.
// usado em: presentation/cycles
export const NOTES_CYCLE: Cycle = {
  id: "notes",
  title: "Notas de filmes: rank de notas",
  intro: "A pessoa dá uma nota no card. A nota é gravada no Firebase e, como o rank é calculado a partir das notas, ele se reordena sozinho.",
  steps: [
    {
      id: "rate",
      title: "Dar a nota no card",
      text: "O card tem um campo de nota que chama media.rate(item, nota). Um filme só pode ser avaliado depois de marcado como visto; série e anime podem ser avaliados sempre. Sem login, o campo fica desligado.",
      code: { file: "src/components/molecules/MediaCard/index.tsx", name: "MediaCard", from: "<RatingInput rating", lines: 1 },
    },
    {
      id: "validate",
      title: "Valida o número",
      text: "O que a pessoa digita passa pelo parseRating: aceita vírgula (8,5), só vale de 1 a 10 e é arredondado para o meio ponto mais perto. Campo vazio apaga a nota. Valor inválido não é enviado (o campo fica marcado), e nota igual à anterior também não.",
      code: { file: "src/components/atoms/RatingInput/index.tsx", name: "parseRating" },
    },
    {
      id: "save",
      title: "O contexto grava a nota",
      text: "O rate faz três coisas, nesta ordem: muda a tela na hora, grava no Firebase e, se der erro, desfaz. É o mesmo desenho da marcação de filmes vistos. Clique em uma delas.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "rate" },
      children: [
        {
          id: "optimistic",
          title: "Muda a tela na hora",
          text: "Guarda o estado anterior e troca a lista de registros: o título entra com a nota. Se a nota foi apagada e o filme nem estava marcado como visto, o registro some da lista.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "rate", from: "const previous = records;", lines: 3 },
        },
        {
          id: "write",
          title: "Grava no Firebase",
          lane: "firebase",
          text: "O saveRating escreve a nota em users/<uid>/watched/<tipo>-<id>, junto com os dados do card. Sem nota: se o filme está marcado como visto, só remove o campo da nota; se não, apaga o registro inteiro.",
          code: { file: "src/actions/helpers/watched/index.ts", name: "saveRating" },
        },
        {
          id: "undo",
          title: "Se der erro, volta atrás",
          text: "Se o Firebase recusar, o erro vai para o console e a lista volta ao estado anterior. Não existe loading aqui: a tela já mudou antes de gravar.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "rate", from: "} catch (err) {", to: "setRecords(previous);", after: 1 },
        },
      ],
    },
    {
      id: "state",
      title: "O estado de notas é recalculado",
      text: "Os registros mudaram, então o mapa ratings é refeito: chave do título (movie-<id> ou tv-<id>) e a nota. É dele que o card e o rank leem as notas.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "ratings" },
    },
    {
      id: "build",
      title: "O rank é montado",
      text: "O useMyNotes monta o rank a partir desse mapa. Ele escolhe as melhores notas, transforma cada uma em item de rank e devolve a lista, o loading e as chaves que a Sugestão da IA usa. Clique em uma das partes.",
      code: { file: "src/actions/helpers/rank/index.ts", name: "useMyNotes" },
      children: [
        {
          id: "top",
          title: "Escolhe as melhores notas",
          text: "O topRatedKeys fica só com as notas do tipo da página (movie- ou tv-), ordena da maior para a menor e, em caso de empate, deixa na frente a que foi marcada mais recentemente. Corta em 20.",
          code: { file: "src/actions/helpers/rank/index.ts", name: "topRatedKeys" },
        },
        {
          id: "category",
          title: "Séries e animes filtram a categoria",
          lane: "series",
          text: "Em Filmes não há filtro de categoria. Em Séries e Animes, o keyFilter deixa passar só os títulos cuja categoria guardada é a da página. É assim que uma nota de anime não aparece no rank de séries.",
          code: { file: "src/actions/helpers/rank/index.ts", name: "useMyNotes", from: "const keyFilter", lines: 1 },
        },
        {
          id: "items",
          title: "Transforma em itens de rank",
          text: "Para cada chave escolhida, procura os dados do card que já estão guardados (título, imagens) e monta o item. Se o título não tem dados guardados, não entra. Nenhuma chamada ao TMDb.",
          code: { file: "src/actions/helpers/rank/index.ts", name: "useMyNotes", from: "const items = useMemo(", to: "[ratings, checkedMap, titles, mediaKind, keyFilter]", after: 1 },
        },
        {
          id: "item",
          title: "Cada item leva nota e visto",
          text: "O useToRankItem monta o item com a nota da pessoa (ratings), se o título está marcado (isChecked) e o card completo, para marcar e avaliar direto no rank.",
          code: { file: "src/actions/helpers/rank/index.ts", name: "useToRankItem" },
        },
      ],
    },
    {
      id: "slice",
      title: "A section pega a sua fatia",
      text: "O dashboard chama o useMyNotes com o tipo da página (usePageFirebase) e a section Seu Rank de Notas só pega esse pedaço pronto. Ela não calcula nada sozinha.",
      code: { file: "src/actions/movies/mynotesrank/index.ts", name: "useMoviesMyNotesRank" },
    },
    {
      id: "screen",
      title: "A tela mostra o rank",
      text: "O RankSection entrega ao rank os itens, o loading (enquanto o Firebase ainda lê o que a pessoa avaliou) e a mensagem para quando não há nota. Clique para ver como dar nota direto no rank.",
      code: { file: "src/components/organisms/RankSection/index.tsx", name: "RankSection", from: "items={myNotes.items}", lines: 4 },
      note: "Atenção: este rank não tem estado de erro. Se a leitura do Firebase falhar, o erro vai só para o console e o rank aparece vazio. É o comportamento atual do código.",
      children: [
        {
          id: "inrank",
          title: "Dar a nota pelo próprio rank",
          text: "Os cards do rank usam as mesmas ações dos outros cards. O onRate chama o mesmo media.rate do início do ciclo, então a nota dada aqui também é gravada e recalculada.",
          code: { file: "src/actions/helpers/rank/index.ts", name: "useRankHandlers" },
        },
      ],
    },
    {
      id: "reorder",
      title: "Mudou a nota, o rank se reordena",
      text: "Não existe uma ação de reordenar. O rank é um cálculo que depende de ratings (e dos outros itens desta lista). Quando a nota muda, o cálculo roda de novo e a lista aparece na nova ordem, sem recarregar a página.",
      code: { file: "src/actions/helpers/rank/index.ts", name: "useMyNotes", from: "[ratings, checkedMap, titles, mediaKind, keyFilter]", lines: 1 },
    },
  ],
};
