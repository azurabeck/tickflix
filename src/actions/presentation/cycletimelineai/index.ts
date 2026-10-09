import type { Cycle } from "@/actions/presentation/cycles";

// Ciclo 5: como uma timeline é criada a partir de um texto, com a ajuda da IA. Os trechos de código são lidos do próprio projeto.
// usado em: presentation/cycles
export const TIMELINEAI_CYCLE: Cycle = {
  id: "timelineai",
  title: "Criação de timelines com IA",
  intro: "A pessoa descreve uma timeline em uma frase. O texto vai direto para a IA, que pesquisa e devolve a lista; o TMDb só confere cada título. Depois a pessoa ajusta conversando e salva.",
  steps: [
    {
      id: "type",
      title: "Digita o tema",
      text: "Na faixa \"Criar uma nova timeline\", a pessoa escreve o tema (por exemplo, \"filmes do Nolan\") no campo. A cada tecla, o texto vai para o estado (onChange); Enter também abre o modal (onKeyDown). Clique em uma parte.",
      code: { file: "src/components/organisms/CreateTimelinePanel/index.tsx", name: "CreateTimelinePanel", from: "<input", to: "/>" },
      children: [
        {
          id: "state",
          title: "O texto fica no estado",
          text: "O description guarda o que está no campo. O modalDescription guarda o texto que será mandado ao modal (vazio enquanto ele está fechado).",
          code: { file: "src/components/organisms/CreateTimelinePanel/index.tsx", name: "CreateTimelinePanel", from: "const [description, setDescription]", lines: 2 },
        },
        {
          id: "open",
          title: "Enter ou o botão abrem o modal",
          text: "O handleOpenModal confere duas coisas: se a pessoa está logada e se o texto não está vazio (trim tira os espaços das pontas). Se sim, copia o texto limpo para o modalDescription. O botão fica desligado nessas mesmas condições.",
          code: { file: "src/components/organisms/CreateTimelinePanel/index.tsx", name: "handleOpenModal" },
        },
        {
          id: "pass",
          title: "O texto vai para o modal",
          text: "Quando o modalDescription tem texto, o modal aparece e recebe esse texto em initialDescription. É a partir dele que a busca começa.",
          code: { file: "src/components/organisms/CreateTimelinePanel/index.tsx", name: "CreateTimelinePanel", from: "{modalDescription && uid", lines: 3 },
        },
      ],
    },
    {
      id: "modal",
      title: "O modal liga o hook",
      text: "O modal recebe o tema e chama o useTimelineChat. Todo o ciclo mora nesse hook: o modal só mostra o que ele devolve. Cada item tem um comentário dizendo o que é: a conversa, a lista, o loading, os erros e as ações de enviar e salvar.",
      code: { file: "src/components/organisms/CreateTimelineModal/index.tsx", name: "CreateTimelineModal", from: "turns,", to: "} = useTimelineChat", before: 1 },
    },
    {
      id: "first",
      title: "A primeira busca",
      text: "Assim que o modal abre, o useEffect chama o search e a busca começa (o loading já nasce ligado). O que acontece, em ordem: o search chama a busca, a IA responde, o TMDb confere os títulos e, no fim, o resultado volta para cá. Clique em uma parte para seguir.",
      code: { file: "src/actions/helpers/createtimeline/index.ts", name: "useTimelineChat", from: "// 1. primeira resolução", lines: 3 },
      children: [
        {
          id: "search",
          title: "O search chama a busca",
          text: "O search é a porta de entrada: chama o resolveTimelineMovies (a IA e o TMDb, que vêm a seguir) e, quando ele termina, guarda a lista na tela (setDraft) e devolve quantos títulos vieram. É o mesmo search que roda de novo nos ajustes.",
          code: { file: "src/actions/helpers/createtimeline/index.ts", name: "search" },
        },
        {
          id: "ai",
          title: "O texto vai direto para a IA",
          text: "O resolveTimelineMovies manda o pedido da pessoa para a IA, com a pesquisa do Google ligada (o true). A IA devolve o nome da timeline e a lista de títulos, cada um com nome, ano e tipo. Clique em uma parte.",
          code: { file: "src/actions/helpers/timelineai/index.ts", name: "resolveTimelineMovies", from: "const answer = await geminiGenerateJSON", lines: 1 },
          children: [
            {
              id: "prompt",
              title: "O pedido (prompt)",
              text: "O prompt é curto: pede os filmes, as séries ou os animes (conforme a página), de acordo com o texto da pessoa, pesquisando no Google e só com títulos reais. O texto da pessoa entra no fim, do jeito que ela escreveu.",
              code: { file: "src/actions/helpers/timelineai/index.ts", name: "buildPrompt" },
            },
            {
              id: "schema",
              title: "O formato da resposta (schema)",
              text: "Os detalhes do formato ficam no schema, e não no prompt: um nome e uma lista de itens com título, ano e tipo (filme ou série), cada campo com uma explicação curta. Não pedimos ids: quem dá o id é o TMDb.",
              code: { file: "src/actions/helpers/timelineai/index.ts", name: "TIMELINE_SCHEMA" },
            },
            {
              id: "lock",
              title: "Séries e animes travam o tipo",
              lane: "series",
              text: "As páginas Séries e Animes passam categoryLock, que troca a palavra no começo do prompt: séries de TV ou animes (animação japonesa). Sem trava, o pedido é por filmes e séries.",
              code: { file: "src/actions/helpers/timelineai/index.ts", name: "categoryWord" },
            },
            {
              id: "send",
              title: "Escolhe a chave: do sistema ou da pessoa",
              text: "O geminiGenerateJSON decide qual chave usar na hora: a da própria pessoa, direto ao Google, ou a do sistema, pelo backend. Clique para ver cada um.",
              code: { file: "src/service/IASettings.ts", name: "geminiGenerateJSON" },
              children: [
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
          ],
        },
        {
          id: "tmdb",
          title: "O TMDb confere cada título",
          text: "Só depois que a IA devolve a lista, cada título é procurado no TMDb (nome, ano e tipo) para pegar o id e o pôster reais. O que o TMDb não achar é descartado e os repetidos são unidos. Se no fim não sobrar nenhum, dá o erro \"Não encontramos nenhum título pra esse tema\".",
          code: { file: "src/actions/helpers/timelineai/index.ts", name: "resolveTimelineMovies", from: "const lockedType", to: "return { name:" },
        },
        {
          id: "outcome",
          title: "Contagem, erro e loading",
          text: "De volta ao useEffect: se deu certo, anota no turno quantos títulos vieram. Se deu erro, a mensagem aparece na conversa. O finally desliga o loading nos dois casos.",
          code: { file: "src/actions/helpers/createtimeline/index.ts", name: "useTimelineChat", from: ".then((count) =>", to: ".finally(() => setLoading(false));" },
        },
      ],
    },
    {
      id: "chat",
      title: "Ajustar conversando",
      text: "A pessoa pode escrever ajustes (por exemplo, \"só os 5 melhores\"). O send manda para a IA (respondToTimelineChat) três coisas: as mensagens até agora, a lista que está na tela e a mensagem nova. Ela responde e diz se é um pedido de mudança. Se for, o mesmo search roda de novo, com o pedido original e todos os ajustes; se for só uma pergunta, só responde. Loading e erro funcionam como na primeira busca.",
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
      text: "O onSaved recarrega a página (window.location.reload), para a nova timeline aparecer na lista \"Timelines que você segue\".",
      code: { file: "src/components/organisms/CreateTimelinePanel/index.tsx", name: "handleSaved" },
    },
  ],
};
