import type { Cycle } from "@/actions/presentation/cycles";

// Problema 1: o cache dos dados. Os trechos de código são lidos do próprio projeto, então são sempre os reais.
// usado em: presentation/cycles
export const CACHE_PROBLEM: Cycle = {
  id: "cache",
  title: "O cache dos dados",
  intro: "Os mesmos dados do TMDb são pedidos por muita gente, o tempo todo. O cache guarda as respostas em camadas para pedir ao TMDb o mínimo possível.",
  problem: {
    why: "Sem cache, cada visita pedia tudo de novo ao TMDb. A página ficava lenta e, com várias pessoas ao mesmo tempo, o TMDb recusava pedidos (erro 429, \"muitos pedidos\"). O servidor precisou de um limite de pedidos simultâneos e de novas tentativas só por causa disso.",
    what: "Passamos a guardar as respostas por 7 dias, em duas camadas: no servidor, compartilhado por todo mundo, e no navegador de cada pessoa. O botão Atualizar limpa tudo e busca de novo.",
  },
  steps: [
    {
      id: "browser",
      title: "O navegador olha o cache",
      text: "Quando a página abre, o readGroupCache procura no localStorage cada grupo de sections. Se achou, a section aparece na hora, sem chamar o backend.",
      code: { file: "src/actions/helpers/pagebackend/index.ts", name: "readGroupCache" },
    },
    {
      id: "ttl",
      title: "O cache tem prazo: 7 dias",
      text: "O getPageCache compara a data em que o dado foi guardado com a de hoje. Passou de 7 dias, ele finge que não existe e o dado é buscado de novo.",
      code: { file: "src/actions/helpers/pagecache/index.ts", name: "getPageCache" },
    },
    {
      id: "complete",
      title: "Só guarda resposta completa",
      text: "Um grupo só vai para o cache se veio inteiro, sem erro. Uma lista vazia vale (um streaming pode não ter animes), menos a do hero: sem trailers é falha, e guardar isso deixaria o topo vazio até o cache vencer.",
      code: { file: "src/actions/helpers/pagebackend/index.ts", name: "isComplete" },
    },
    {
      id: "server",
      title: "O servidor olha o cache dele",
      text: "Se o navegador não tinha, o backend repete a ideia, agora com cache compartilhado por todo mundo: se alguém já buscou, só lê; se não, busca, salva e devolve. Se a busca falhar, devolve null e a section mostra erro.",
      code: { file: "api/_lib/sharedCache.ts", name: "cachedOrFetch" },
    },
    {
      id: "tmdb",
      title: "Quando precisa, pede ao TMDb com limite",
      text: "Só quando não há cache o servidor fala com o TMDb. Ele espera uma vaga (no máximo 6 pedidos ao mesmo tempo, com um intervalo entre eles) e, se o TMDb responder 429, espera e tenta de novo, até 3 vezes.",
      code: { file: "api/_lib/tmdbServer.ts", name: "tmdbFetchServer", from: "await acquireSlot();", lines: 10 },
    },
    {
      id: "refresh",
      title: "Atualizar limpa tudo",
      text: "O item Atualizar do menu do usuário apaga o cache do navegador e avisa todas as páginas para buscarem tudo de novo. Esse aviso também manda o servidor ignorar o cache dele na próxima busca.",
      code: { file: "src/actions/helpers/usermenu/index.ts", name: "refresh" },
    },
  ],
};
