import { useEffect, useState } from "react";
import { callSuggestionsApi } from "@/service/IASettings";
import { currentTmdbLanguage } from "@/service/TMDbSettings";
import { getUserGenres } from "@/actions/helpers/preferences";
import { useMediaCards } from "@/contexts/MediaCards";

export type SuggestionKind = "movie" | "tv";

interface AiSuggestion {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  available?: boolean;
}

// O que o backend devolve: "no-taste" = ainda não há o que basear (sem notas, vistos ou seguidos); slot null = lugar livre para renovar.
interface SuggestionsResponse {
  status: "ok" | "no-taste";
  basis: "ratings" | "watched" | null;
  slots: (AiSuggestion | null)[];
}

interface DailyOptions {
  mediaKind: SuggestionKind;
  category?: "series" | "animes";
}

// 429 = cota do Gemini esgotada: tentar de novo só gasta mais.
const isQuotaError = (err: unknown): boolean => err instanceof Error && /429/.test(err.message);

// Pedidos em andamento por tipo/categoria: se a tela montar duas vezes seguidas, as duas esperam o mesmo pedido (o servidor gera só uma vez).
const pending = new Map<string, Promise<SuggestionsResponse>>();

// Um único pedido autenticado ao backend. Ele escolhe a base de gosto, guarda as 3 sugestões do dia e só chama a IA quando precisa.
const requestSuggestions = (action: "load" | "refresh", { mediaKind, category }: DailyOptions): Promise<SuggestionsResponse> => {
  const key = `${action}:${mediaKind}:${category ?? ""}`;
  const running = pending.get(key);
  if (running) return running;

  const request = callSuggestionsApi<SuggestionsResponse>({
    action,
    mediaKind,
    category,
    lang: currentTmdbLanguage(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    genres: getUserGenres(),
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
};

// Sugestões da IA do dia: o front só pede ao backend e guarda carregando / erro / o que mostrar.
// Filme visto ou série seguida vira um lugar livre (botão de refresh), sem chamar a IA; o refresh preenche só os lugares livres.
// usado em: presentation/cyclesuggestions, AiSuggestionsPanel
export const useDailySuggestions = ({ mediaKind, category }: DailyOptions) => {
  const media = useMediaCards();
  const { uid } = media;

  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [quotaHit, setQuotaHit] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  // Abre a tela (ou tenta de novo): pede as sugestões de hoje.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setQuotaHit(false);
    requestSuggestions("load", { mediaKind, category })
      .then((response) => !cancelled && setData(response))
      .catch((err) => {
        console.error("Erro ao carregar sugestões da IA:", err);
        if (cancelled) return;
        setFailed(true);
        setQuotaHit(isQuotaError(err));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [uid, mediaKind, category, attempt]);

  // Preenche os lugares livres com sugestões novas.
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshFailed(false);
    setQuotaHit(false);
    try {
      setData(await requestSuggestions("refresh", { mediaKind, category }));
    } catch (err) {
      console.error("Erro ao pedir novas sugestões da IA:", err);
      setRefreshFailed(true);
      setQuotaHit(isQuotaError(err));
    } finally {
      setRefreshing(false);
    }
  };

  // O que acabou de ser assistido/seguido já aparece como lugar livre, sem esperar o backend.
  const slots = (data?.slots ?? []).map((slot) => (slot && media.isChecked({ id: slot.id, mediaType: slot.mediaType }) ? null : slot));

  return {
    slots,
    basis: data?.basis ?? null,
    noTaste: data?.status === "no-taste" && slots.length === 0,
    loading,
    failed,
    quotaHit,
    refreshing,
    refreshFailed,
    refresh,
    retry: () => setAttempt((n) => n + 1),
  };
};
