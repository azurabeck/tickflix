import { useEffect, useMemo, useRef, useState } from "react";
import { geminiGenerateJSON, type GeminiSchema } from "@/service/IASettings";
import { getPageCache, setPageCache } from "@/actions/helpers/pagecache";
import { searchTmdbTitle } from "@/service/TMDbSettings";
import { movieKey } from "@/actions/helpers/timelines";
import { getUserGenres } from "@/actions/helpers/preferences";
import { useMediaCards } from "@/contexts/MediaCards";
import { fetchAvailabilityMap } from "@/actions/helpers/moviedetail";
import { topRatedKeys } from "@/actions/helpers/rank";

interface TasteTitle {
  title: string;
  year: string;
  rating: number | null;
}

type SuggestionBasis = "ratings" | "watched";

export type SuggestionKind = "movie" | "tv";

interface AiSuggestion {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  available?: boolean;
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

const SUGGESTION_COUNT = 3;

const EXTRA_REQUESTED = 5;

const describe = (taste: TasteTitle[], basis: SuggestionBasis): string =>
  taste
    .map((t) => (basis === "ratings" && t.rating !== null ? `- ${t.title} (${t.year}) — nota do usuário: ${t.rating}/10` : `- ${t.title} (${t.year})`))
    .join("\n");

const fetchAiSuggestions = async (
  taste: TasteTitle[],
  basis: SuggestionBasis,
  preferredGenres: string[],
  excludedKeys: Set<string>,
  kind: SuggestionKind = "movie",
  count: number = SUGGESTION_COUNT,
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
  // uma consulta só para saber quais dá para assistir (as sugestões não vêm do backend com isso pronto)
  const availability = await fetchAvailabilityMap(result);
  return result.map((suggestion) => ({ ...suggestion, available: availability.has(movieKey(suggestion.mediaType, suggestion.id)) }));
};


const TASTE_SIZE = 10;
const RECENT_TASTE_SIZE = 12;

// O que fica guardado do dia: os lugares (sugestão ou null = já assistida, mostra o refresh)
// e tudo que já foi sugerido hoje (pra não repetir).
interface DailySuggestions {
  day: string;
  slots: (AiSuggestion | null)[];
  history: string[];
}

// 429 = cota do Gemini esgotada: tentar de novo só gasta mais.
const isQuotaError = (err: unknown): boolean => err instanceof Error && /429/.test(err.message);

// Cota esgotada ou chave do servidor recusada: tentar de novo logo em seguida não adianta (e só enche o console e gasta cota).
// A falha fica guardada na sessão por 30 minutos; o botão "Tentar de novo" ignora isso.
const BLOCK_KEY = "ai-suggestions-blocked";
const BLOCK_MS = 30 * 60 * 1000;
const isBlocked = (): boolean => {
  try {
    return Date.now() - Number(sessionStorage.getItem(BLOCK_KEY) ?? 0) < BLOCK_MS;
  } catch {
    return false;
  }
};
const blockForAWhile = (err: unknown): void => {
  if (!(err instanceof Error) || !/429|chave do Gemini/i.test(err.message)) return;
  try {
    sessionStorage.setItem(BLOCK_KEY, String(Date.now()));
  } catch {
    // sessionStorage indisponível: segue sem guardar
  }
};

const todayKey = (): string => new Date().toLocaleDateString("sv-SE");
const storageKey = (kind: SuggestionKind, anime: boolean): string => `ai-daily-suggestions:${anime ? "anime" : kind}`;

interface DailyOptions {
  recentKeys: string[];
  mediaKind: SuggestionKind;
  category?: "series" | "animes";
  keyFilter?: (key: string) => boolean;
}

// Ciclo "sugestões do dia": gera 3 uma vez por dia (guardadas no cache local); o que o usuário
// assiste vira um botão de refresh sem chamar a IA; o refresh pede de uma vez tantas sugestões
// quantos lugares vazios existem.
// usado em: AiSuggestionsPanel
export const useDailySuggestions = ({ recentKeys, mediaKind, category, keyFilter }: DailyOptions) => {
  const isAnime = category === "animes";
  const media = useMediaCards();
  const { uid, ratings, checkedMap } = media;
  const prefix = `${mediaKind}-`;

  const ratedKeys = useMemo(
    () => topRatedKeys(ratings, checkedMap, prefix, keyFilter, TASTE_SIZE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ratings, checkedMap, prefix, keyFilter]
  );
  const recentTaste = useMemo(() => recentKeys.slice(0, RECENT_TASTE_SIZE), [recentKeys]);

  const hasWatchedOfKind = [...checkedMap.keys()].some((key) => key.startsWith(prefix));
  const basis: SuggestionBasis | null = ratedKeys.length > 0 ? "ratings" : hasWatchedOfKind && recentTaste.length > 0 ? "watched" : null;
  const tasteKeys = basis === "ratings" ? ratedKeys : basis === "watched" ? recentTaste : [];
  // título e ano do que o usuário viu/avaliou já estão guardados (MediaCardsProvider); só espera ao menos um estar pronto
  const { titles } = media;
  const ready = tasteKeys.some((key) => titles.has(key));

  const [daily, setDaily] = useState<DailySuggestions | null>(() => {
    if (!uid) return null;
    const saved = getPageCache<DailySuggestions>(uid, storageKey(mediaKind, isAnime));
    return saved && saved.day === todayKey() ? saved : null;
  });
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [quotaHit, setQuotaHit] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const inFlight = useRef(false);

  const save = (next: DailySuggestions) => {
    setDaily(next);
    if (uid) setPageCache(uid, storageKey(mediaKind, isAnime), next);
  };

  const buildTaste = (): TasteTitle[] =>
    tasteKeys.flatMap((key): TasteTitle[] => {
      const resolved = titles.get(key);
      return resolved ? [{ title: resolved.title, year: resolved.year ?? "", rating: ratings.get(key) ?? null }] : [];
    });

  const excludedKeys = (current: DailySuggestions | null): Set<string> => {
    const keys = new Set<string>([...checkedMap.keys(), ...ratings.keys()]);
    for (const key of current?.history ?? []) keys.add(key);
    for (const slot of current?.slots ?? []) if (slot) keys.add(movieKey(slot.mediaType, slot.id));
    return keys;
  };

  useEffect(() => {
    if (daily || !basis || !uid || !ready || inFlight.current) return;
    if (attempt === 0 && isBlocked()) {
      setFailed(true);
      return;
    }

    inFlight.current = true;
    let cancelled = false;
    (async () => {
      setGenerating(true);
      setFailed(false);
      setQuotaHit(false);
      try {
        const taste = buildTaste();
        if (taste.length === 0) throw new Error("Nenhum título do gosto do usuário foi resolvido.");

        const result = await fetchAiSuggestions(taste, basis, getUserGenres(), excludedKeys(null), mediaKind, SUGGESTION_COUNT, isAnime);
        if (cancelled) return;
        if (result.length === 0) throw new Error("A IA não devolveu nenhuma sugestão válida.");
        save({
          day: todayKey(),
          slots: Array.from({ length: SUGGESTION_COUNT }, (_, i) => result[i] ?? null),
          history: result.map((s) => movieKey(s.mediaType, s.id)),
        });
      } catch (err) {
        console.error("Erro ao gerar sugestões da IA:", err);
        blockForAWhile(err);
        if (!cancelled) {
          setFailed(true);
          setQuotaHit(isQuotaError(err));
        }
      } finally {
        inFlight.current = false;
        if (!cancelled) setGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
      inFlight.current = false;
    };
    // Só reage a "tem base de gosto e os títulos resolveram" e ao retry — nada de chamar a IA a cada nota.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis !== null, ready, uid, attempt, daily === null]);

  // Assistiu (filme visto / série seguida): o card vira botão de refresh, sem chamar a IA.
  useEffect(() => {
    if (!daily) return;
    const slots = daily.slots.map((slot) => (slot && media.isChecked({ id: slot.id, mediaType: slot.mediaType }) ? null : slot));
    if (slots.some((slot, i) => slot !== daily.slots[i])) save({ ...daily, slots });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily, checkedMap]);

  const refresh = async () => {
    if (!daily || !uid || refreshing) return;
    const emptyCount = daily.slots.filter((slot) => slot === null).length;
    if (emptyCount === 0) return;

    setRefreshing(true);
    setRefreshFailed(false);
    setQuotaHit(false);
    try {
      const taste = buildTaste();
      if (!basis || taste.length === 0) throw new Error("Sem base de gosto pra pedir sugestões.");

      const result = await fetchAiSuggestions(taste, basis, getUserGenres(), excludedKeys(daily), mediaKind, emptyCount, isAnime);
      if (result.length === 0) throw new Error("A IA não devolveu nenhuma sugestão nova.");

      const queue = [...result];
      save({
        ...daily,
        slots: daily.slots.map((slot) => slot ?? queue.shift() ?? null),
        history: [...daily.history, ...result.map((s) => movieKey(s.mediaType, s.id))],
      });
    } catch (err) {
      console.error("Erro ao pedir novas sugestões da IA:", err);
      setRefreshFailed(true);
      setQuotaHit(isQuotaError(err));
    } finally {
      setRefreshing(false);
    }
  };

  return { daily, basis, generating, failed, quotaHit, refreshing, refreshFailed, refresh, retry: () => setAttempt((n) => n + 1) };
};
