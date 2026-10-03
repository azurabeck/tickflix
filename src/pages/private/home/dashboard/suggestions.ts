// src/pages/private/home/dashboard/suggestions.ts
// "Sugestão da IA" da Home — pedido da Rebecca: a IA sugere a partir das
// NOTAS do usuário (os filmes preferidos dele); sem nenhuma nota, sugere
// pelo tipo de filme que ele mais assiste (o que ele marcou como visto);
// sem nada marcado como visto, a tela só mostra uma mensagem esperando
// ação do usuário (ver AiSuggestionsPanel.tsx).
//
// Roda no BROWSER (não no backend compartilhado): a chave do Gemini do
// usuário fica só no localStorage dele (service/IASettings.ts) e a
// sugestão é pessoal, não um feed igual pra todo mundo.
import { geminiGenerateJSON, type GeminiSchema } from "@/service/IASettings";
import { searchTmdbTitle } from "@/service/TMDbSettings";
import { movieKey } from "@/service/TimelineSettings";

export interface TasteTitle {
  title: string;
  year: string;
  // Nota do usuário (1 a 10) — `null` quando a base é "assistidos".
  rating: number | null;
}

export type SuggestionBasis = "ratings" | "watched";

// A Home sugere FILMES, a página Séries sugere SÉRIES.
export type SuggestionKind = "movie" | "tv";

export interface AiSuggestion {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
}

interface RawSuggestion {
  title: string;
  year: number;
  mediaType: string;
}

const SUGGESTIONS_SCHEMA: GeminiSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      year: { type: "INTEGER" },
      mediaType: { type: "STRING" },
    },
    required: ["title", "year", "mediaType"],
  },
};

// Quantas sugestões o painel mostra de uma vez.
export const SUGGESTION_COUNT = 3;
// Pede mais que o necessário: a IA às vezes sugere algo que o usuário já
// viu (apesar da instrução) ou que não existe no TMDb — sobra margem pra
// descartar sem ficar com menos do que foi pedido.
const EXTRA_REQUESTED = 5;

const describe = (taste: TasteTitle[], basis: SuggestionBasis): string =>
  taste
    .map((t) => (basis === "ratings" && t.rating !== null ? `- ${t.title} (${t.year}) — nota do usuário: ${t.rating}/10` : `- ${t.title} (${t.year})`))
    .join("\n");

// Só dá pra recomendar com ALGUM sinal de gosto — sem nenhum título visto
// o painel mostra a mensagem de espera, nunca chama a IA à toa.
export const fetchAiSuggestions = async (
  taste: TasteTitle[],
  basis: SuggestionBasis,
  preferredGenres: string[],
  // Chaves que NÃO podem voltar: o que o usuário já viu/avaliou, o que já está
  // na tela e o que já foi sugerido hoje.
  excludedKeys: Set<string>,
  kind: SuggestionKind = "movie",
  // Quantas sugestões devolver (3 na carga do dia; 1..3 ao repor as assistidas).
  count: number = SUGGESTION_COUNT,
  // Página Animes: continua sendo `tv` no TMDb, mas só vale anime.
  anime: boolean = false
): Promise<AiSuggestion[]> => {
  const kindWord = anime ? "animes (séries de animação japonesa)" : kind === "tv" ? "séries" : "filmes";
  const intro =
    basis === "ratings"
      ? "Estes são os filmes/séries preferidos do usuário, com a nota que ele mesmo deu (1 a 10) — quanto maior a nota, mais ele gostou:"
      : "O usuário ainda não deu notas, mas estes são os títulos que ele marcou como assistidos — deduza daí o tipo de conteúdo (gêneros, tom, época, país) que ele mais assiste:";

  const genres = preferredGenres.length > 0 ? `\nGêneros que o usuário disse preferir: ${preferredGenres.join(", ")}.` : "";

  const prompt = `${intro}
${describe(taste, basis)}
${genres}

Sugira ${count + EXTRA_REQUESTED} ${kindWord} (SOMENTE ${kindWord}, nada de ${kind === "tv" ? (anime ? "filmes nem séries que não sejam anime" : "filmes") : "séries"}) que combinem com esse gosto, em ordem do que mais combina pro que menos. Regras:
- NÃO sugira nenhum título da lista acima (o usuário já viu).
- Prefira títulos conhecidos o bastante pra existir no TMDb, de qualquer época.
- mediaType: sempre "${kind}".
- title: título ORIGINAL, como apareceria numa busca no TMDb; year: ano de lançamento.
Responda só o JSON.`;

  const raw = await geminiGenerateJSON<RawSuggestion[]>(prompt, SUGGESTIONS_SCHEMA);

  const resolved = await Promise.all(
    raw.map(async (item): Promise<AiSuggestion | null> => {
      try {
        const match = await searchTmdbTitle(item.title, item.year, kind);
        if (!match) return null;
        return { id: match.id, mediaType: match.mediaType, title: match.title, posterPath: match.poster_path };
      } catch (err) {
        console.error(`Erro ao resolver sugestão "${item.title}" no TMDb:`, err);
        return null;
      }
    })
  );

  const seen = new Set<string>();
  const result: AiSuggestion[] = [];
  for (const suggestion of resolved) {
    if (!suggestion) continue;
    const key = movieKey(suggestion.mediaType, suggestion.id);
    if (suggestion.mediaType !== kind || excludedKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(suggestion);
    if (result.length === count) break;
  }
  return result;
};

