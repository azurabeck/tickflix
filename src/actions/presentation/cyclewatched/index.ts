import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 2: o que acontece quando alguém marca um filme como visto. Os trechos de código são lidos do próprio projeto, então são sempre os reais.
// Séries e animes seguem outro caminho (toggleFollow), que é o ciclo 3.
// usado em: presentation/cycles
export const WATCHED_CYCLE: Cycle = {
  id: "watched",
  title: "Marcação de filmes vistos",
  intro: "Um clique no check do card muda a tela na hora e grava no Firebase em seguida. Se a gravação falhar, a tela volta ao que era.",
  steps: [
    {
      id: "click",
      title: "Clique no check do card",
      text: "O check de cada card chama media.toggleChecked(item). Se a pessoa não estiver logada, o botão fica desligado.",
      code: { file: "src/components/molecules/MediaCard/index.tsx", name: "MediaCard", from: 'className={isChecked ? "media-card__icon media-card__icon--checked"', to: "</button>", before: 2 },
    },
    {
      id: "route",
      title: "O contexto escolhe o caminho",
      text: "O toggleChecked olha o tipo do card. Série ou anime vai para o toggleFollow (é outro ciclo). Filme vai para o toggleWatchedMovie, que é o que vemos aqui.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleChecked" },
    },
    {
      id: "mark",
      title: "O filme é marcado",
      text: "O toggleWatchedMovie faz três coisas, nesta ordem: muda a tela na hora, grava no Firebase e, se der erro, desfaz. Clique em uma delas. Não existe loading aqui: a tela já muda antes de gravar.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleWatchedMovie" },
      children: [
        {
          id: "optimistic",
          title: "Muda a tela na hora",
          text: "Primeiro guarda o estado anterior (previous). Depois troca a lista de registros: se ainda não estava visto, entra com a data de agora; se estava, sai. Isso se chama atualização otimista: a tela acredita que vai dar certo.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleWatchedMovie", from: "const nextWatched", lines: 4 },
        },
        {
          id: "save",
          title: "Grava no Firebase",
          lane: "firebase",
          text: "O saveWatched escreve no Firestore, em users/<uid>/watched/movie-<id>. Junto vão os dados do card (título, ano, imagens, se dá para assistir), para outras telas mostrarem o filme sem consultar o TMDb. Desmarcar apaga o registro.",
          code: { file: "src/actions/helpers/watched/index.ts", name: "saveWatched" },
        },
        {
          id: "undo",
          title: "Se der erro, volta atrás",
          text: "Se o Firebase recusar, o catch registra o erro no console e devolve a lista ao estado anterior. Para a pessoa, o check simplesmente volta ao que era.",
          code: { file: "src/contexts/MediaCards/index.tsx", name: "toggleWatchedMovie", from: "} catch (err) {", to: "setRecords(previous);", after: 1 },
        },
      ],
    },
    {
      id: "state",
      title: "O estado é recalculado",
      text: "Os registros mudaram, então o watchedMap é refeito: um mapa com a chave do filme (movie-<id>) e a data em que foi visto. Só entram registros de filmes que têm data de visto.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "watchedMap" },
    },
    {
      id: "card",
      title: "O card aparece marcado",
      text: "O isChecked consulta esse mapa. Todo card da tela usa o mesmo contexto, então todos se redesenham juntos: o check fica preenchido em qualquer lista onde o filme aparecer.",
      code: { file: "src/contexts/MediaCards/index.tsx", name: "isChecked" },
    },
    {
      id: "recent",
      title: "Últimos vistos acompanha",
      text: "A section Últimos vistos lê o mesmo watchedMap: ordena pela data e mostra os mais recentes. O filme recém-marcado aparece ali na hora, usando os dados do card que foram gravados junto.",
      code: { file: "src/actions/movies/recentlywatched/index.ts", name: "useRecentlyWatched" },
    },
  ],
};
