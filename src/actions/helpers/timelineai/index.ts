// Cria uma timeline a partir de um texto livre ("filmes do Nolan", "terror dos anos 80").
// 1. O texto vai direto para o Gemini, com a pesquisa do Google ligada: ele devolve o nome da timeline e a lista de títulos (nome, ano e tipo).
// 2. Cada título da lista é procurado no TMDb, só para pegar o id e o pôster reais.
import { geminiGenerateJSON, type GeminiSchema } from "@/service/IASettings";
import { searchTmdbTitle, type TmdbMovie } from "@/service/TMDbSettings";
import { timelineMovieKey, type ContentType, type TimelineMovie } from "@/actions/helpers/timelines";

// Máximo de títulos que a IA devolve por pedido (a resposta e as buscas no TMDb precisam caber no tempo limite).
const MAX_TITLES = 60;

interface AiTimelineItem {
  title: string;
  year: number;
  mediaType: string;
}

interface AiTimeline {
  name: string;
  items: AiTimelineItem[];
}

const TIMELINE_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING", description: 'Nome curto da timeline (2 a 6 palavras), sem a palavra "Timeline" no início.' },
    items: {
      type: "ARRAY",
      description: "Os títulos, do lançamento mais antigo para o mais novo, a menos que a descrição peça outra ordem.",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Nome original, como apareceria numa busca no TMDb." },
          year: { type: "INTEGER", description: "Ano de lançamento ou de estreia." },
          mediaType: { type: "STRING", description: '"movie" para filme, "tv" para série (anime em formato de série também é "tv").' },
        },
        required: ["title", "year", "mediaType"],
      },
    },
  },
  required: ["name", "items"],
};

const toTimelineMovie = (movie: TmdbMovie): TimelineMovie => ({
  id: movie.id,
  mediaType: movie.mediaType,
  title: movie.title,
  year: movie.year,
  posterPath: movie.poster_path,
  watched: false,
  watchedAt: null,
});

// O que a página pede: só séries, só animes, só filmes (sem trava, filmes e séries).
const categoryWord = (categoryLock?: ContentType): string => {
  if (categoryLock === "animes") return "animes (séries de animação japonesa)";
  if (categoryLock === "series") return "séries de TV";
  if (categoryLock === "filmes") return "filmes";
  return "filmes e séries";
};

const buildPrompt = (description: string, categoryLock?: ContentType): string => `Me traga os ${categoryWord(categoryLock)} de acordo com a descrição abaixo, pesquisando no Google (só títulos reais, até ${MAX_TITLES}).

${description}`;

interface ChatTurnResult {
  reply: string;
  isRefinement: boolean;
}

const CHAT_TURN_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    isRefinement: { type: "BOOLEAN" },
  },
  required: ["reply", "isRefinement"],
};

// Responde uma mensagem do chat de ajuste da timeline e diz se ela pede mudança na lista.
// usado em: helpers/createtimeline, presentation/cycletimelineai
export const respondToTimelineChat = async (previousMessages: string[], currentMovies: TimelineMovie[], userMessage: string): Promise<ChatTurnResult> => {
  const conversationText = previousMessages.map((message, i) => `${i + 1}. ${message}`).join("\n");
  const titlesText = currentMovies.slice(0, 40).map((movie) => `${movie.title} (${movie.year})`).join(", ") || "(nenhum título ainda)";

  const prompt = `Você é o assistente de um app que monta timelines de filmes/séries a partir de um pedido em texto livre. O usuário está num modal de ajuste, revisando o resultado antes de salvar, e acabou de mandar uma mensagem.

Mensagens do usuário até agora (a primeira é o pedido original e as seguintes são ajustes, na ordem):
${conversationText}

Lista atual mostrada pro usuário (${currentMovies.length} título(s) no total, mostrando até 40 aqui): ${titlesText}

Como o sistema funciona de verdade (pra você poder explicar se for perguntado): o pedido (a primeira mensagem mais todos os ajustes) vai direto pra uma IA que faz uma busca de verdade no Google, considerando fontes relevantes pro tipo de pedido (ex.: Wikipédia, IMDb, Letterboxd, MyAnimeList pra anime), e devolve a lista de títulos com nome e ano. Depois o TMDb só confere cada título (id e pôster); ele não decide a lista. Em nenhum caso é uma lista inventada de memória sem busca.

Mensagem nova do usuário: "${userMessage}"

Responda:
- reply: uma resposta curta, direta e honesta em português, conversando de verdade com o usuário — nunca finja que não entendeu e nunca ignore a pergunta. Se ele perguntou algo (ex.: "qual a referência que você tá usando", "por que veio isso", "de onde vêm esses filmes"), EXPLIQUE de verdade como a busca provavelmente interpretou o pedido. Se ele deu um feedback vago tipo "tá errado"/"não é isso" sem dizer o que especificamente mudar, PERGUNTE de volta o que está errado (gênero errado? ano errado? faltou/sobrou título? um título específico?) — não tente adivinhar sozinho. Se ele pediu uma mudança concreta (ex.: "só os 5 melhores", "tira anime", "de 2020 pra frente"), confirme objetivamente o que você vai mudar.
- isRefinement: true SÓ se a mensagem tiver um pedido concreto de mudança na busca. false se for só uma pergunta, comentário ou feedback vago sem instrução específica — nesses casos NÃO tem nada novo pra busca usar, então não refaça a busca (só responda).

Responda só o JSON.`;

  return geminiGenerateJSON<ChatTurnResult>(prompt, CHAT_TURN_SCHEMA, false);
};

// A timeline pronta para mostrar e salvar: o nome, o tipo e os títulos já com id e pôster do TMDb.
// usado em: helpers/createtimeline
export interface ResolvedTimelineDraft {
  name: string;
  types: ContentType[];
  movies: TimelineMovie[];
}

// Transforma uma descrição em texto livre numa lista de títulos reais: o texto vai direto para a IA (com pesquisa do Google)
// e só a lista que ela devolve passa pelo TMDb.
// usado em: franchises/dashboard, helpers/createtimeline, presentation/cycletimelineai, presentation/problemgeminikey
export const resolveTimelineMovies = async (description: string, categoryLock?: ContentType): Promise<ResolvedTimelineDraft> => {
  const answer = await geminiGenerateJSON<AiTimeline>(buildPrompt(description, categoryLock), TIMELINE_SCHEMA, true);

  const lockedType = categoryLock === "filmes" ? "movie" : categoryLock === "series" || categoryLock === "animes" ? "tv" : null;
  const found = await Promise.all(
    answer.items.slice(0, MAX_TITLES).map((item) => {
      const mediaType = lockedType ?? (item.mediaType === "tv" ? "tv" : "movie");
      return searchTmdbTitle(item.title, item.year, mediaType).catch(() => null);
    })
  );

  const byKey = new Map<string, TimelineMovie>();
  for (const movie of found) {
    if (!movie) continue;
    const timelineMovie = toTimelineMovie(movie);
    byKey.set(timelineMovieKey(timelineMovie), timelineMovie);
  }

  const movies = Array.from(byKey.values());
  if (movies.length === 0) throw new Error("Não encontramos nenhum título pra esse tema.");

  return { name: `Timeline ${answer.name || description}`, types: [categoryLock ?? "filmes"], movies };
};
