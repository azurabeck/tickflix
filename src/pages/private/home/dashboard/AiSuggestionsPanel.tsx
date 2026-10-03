// src/pages/private/home/dashboard/AiSuggestionsPanel.tsx
// Painel roxo "Sugestão da IA" (Figma da Rebecca). Base da sugestão, em
// ordem: (1) as NOTAS do usuário (os preferidos dele); (2) sem nota
// nenhuma, o que ele marcou como visto (tipo de filme que mais assiste);
// (3) sem nada visto, só uma mensagem esperando ação dele — a IA nem é
// chamada. Ver suggestions.ts.
//
// A IA NÃO roda a toda hora (pedido da Rebecca):
//   - Gera 3 sugestões UMA vez por dia, ao carregar a página, e guarda as
//     três (service/PageCache.ts, chave com o dia) — voltar à página, dar
//     nota ou marcar qualquer coisa NÃO chama o Gemini de novo.
//   - Quando o usuário marca uma sugestão como assistida, o card dela vira um
//     botão de refresh (sem chamar a IA).
//   - Clicar num refresh pede sugestões novas pra TODOS os lugares vazios de
//     uma vez: 1 assistida → pede 1; 2 → pede 2; 3 → pede 3. Nada do que já
//     foi visto, avaliado, está na tela ou foi sugerido hoje volta.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPageCache, setPageCache } from "@/service/PageCache";
import { getUserGenres } from "@/service/UserPreferencesSettings";
import { movieKey } from "@/service/TimelineSettings";
import { ConnectedSuggestionCard, SuggestionRefreshCard } from "@/components/suggestionCard";
import { useMediaCards } from "@/components/mediaCard";
import type { DashboardMovie } from "./functions";
import { SUGGESTION_COUNT, fetchAiSuggestions, type AiSuggestion, type SuggestionBasis, type SuggestionKind, type TasteTitle } from "./suggestions";
import { useResolvedTitles } from "./useResolvedTitles";

const TASTE_SIZE = 10;
const RECENT_TASTE_SIZE = 12;

// O que fica guardado do dia: os lugares (sugestão ou `null` = já assistida,
// mostra o refresh) e tudo que já foi sugerido hoje (pra não repetir).
interface DailySuggestions {
  day: string;
  slots: (AiSuggestion | null)[];
  history: string[];
}

// 429 = cota do Gemini esgotada (a grátis é de poucas chamadas por dia) —
// tentar de novo agora só gasta mais; a mensagem explica e some o "tentar de novo".
const isQuotaError = (err: unknown): boolean => err instanceof Error && /429/.test(err.message);

const todayKey = (): string => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD no fuso local
const storageKey = (kind: SuggestionKind, anime: boolean): string => `ai-daily-suggestions:${anime ? "anime" : kind}`;

interface AiSuggestionsPanelProps {
  recentlyWatched: DashboardMovie[];
  // O que sugerir (e em que se basear): filmes na Home, séries na página Séries.
  mediaKind?: SuggestionKind;
  // Página Animes: sugere só animes (guardados à parte das séries) e só olha
  // as notas/títulos que `keyFilter` aceita.
  category?: "series" | "animes";
  keyFilter?: (key: string) => boolean;
}

const AiSuggestionsPanel = ({ recentlyWatched, mediaKind = "movie", category, keyFilter }: AiSuggestionsPanelProps) => {
  const isAnime = category === "animes";
  const { t } = useTranslation();
  const media = useMediaCards();
  // "Marcado" = filme visto + série/anime seguido (base do gosto sem nota).
  const { uid, ratings, checkedMap } = media;
  const prefix = `${mediaKind}-`;

  const ratedKeys = useMemo(
    () =>
      [...ratings.entries()]
        .filter(([key]) => key.startsWith(prefix) && (!keyFilter || keyFilter(key)))
        .sort(([keyA, a], [keyB, b]) => b - a || (checkedMap.get(keyB) ?? 0) - (checkedMap.get(keyA) ?? 0))
        .slice(0, TASTE_SIZE)
        .map(([key]) => key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ratings, checkedMap, prefix, keyFilter]
  );
  const recentKeys = useMemo(() => recentlyWatched.slice(0, RECENT_TASTE_SIZE).map((m) => movieKey(m.mediaType, m.id)), [recentlyWatched]);

  const hasWatchedOfKind = [...checkedMap.keys()].some((key) => key.startsWith(prefix));
  const basis: SuggestionBasis | null = ratedKeys.length > 0 ? "ratings" : hasWatchedOfKind && recentKeys.length > 0 ? "watched" : null;
  const tasteKeys = basis === "ratings" ? ratedKeys : basis === "watched" ? recentKeys : [];
  const { titles, ready } = useResolvedTitles(tasteKeys);

  // Sugestões do dia — lidas do cache local UMA vez, no mount.
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
      return resolved ? [{ title: resolved.title, year: resolved.year, rating: ratings.get(key) ?? null }] : [];
    });

  const excludedKeys = (current: DailySuggestions | null): Set<string> => {
    const keys = new Set<string>([...checkedMap.keys(), ...ratings.keys()]);
    for (const key of current?.history ?? []) keys.add(key);
    for (const slot of current?.slots ?? []) if (slot) keys.add(movieKey(slot.mediaType, slot.id));
    return keys;
  };

  // Carga do DIA: só roda se ainda não há sugestões de hoje.
  useEffect(() => {
    if (daily || !basis || !uid || !ready || inFlight.current) return;

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
    // Só reage a "tem base de gosto e os títulos resolveram" e ao retry — não a
    // cada nota/marcação nova (nada de chamar a IA toda hora).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis !== null, ready, uid, attempt, daily === null]);

  // Assistiu (filme visto / série seguida): o card vira botão de refresh,
  // sem chamar a IA.
  useEffect(() => {
    if (!daily) return;
    const slots = daily.slots.map((slot) => (slot && media.isChecked({ id: slot.id, mediaType: slot.mediaType }) ? null : slot));
    if (slots.some((slot, i) => slot !== daily.slots[i])) save({ ...daily, slots });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily, checkedMap]);

  // Refresh: pede, de uma vez, tantas sugestões quantos lugares vazios há.
  const handleRefresh = async () => {
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

  // Claquete/tv ("disponível") das sugestões na tela.
  useEffect(() => {
    const shown = (daily?.slots ?? []).filter((slot): slot is AiSuggestion => slot !== null);
    if (shown.length > 0) media.loadAvailability(shown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily]);

  const showEmptyHint = !daily && !basis;

  return (
    <section className="home-section ai-panel">
      <h3 className="ai-panel__title">{t("dashboard.ai.title")}</h3>
      {(daily || basis) && <p className="ai-panel__basis">{t(basis === "watched" ? "dashboard.ai.basisWatched" : "dashboard.ai.basisRatings")}</p>}

      {showEmptyHint && <p className="ai-panel__message">{t("dashboard.ai.empty")}</p>}
      {!daily && basis && generating && <p className="ai-panel__message">{t("dashboard.ai.loading")}</p>}
      {!daily && basis && failed && !generating && (
        <div className="ai-panel__message">
          <p>{t(quotaHit ? "dashboard.ai.quota" : "dashboard.ai.error")}</p>
          {!quotaHit && (
            <button type="button" className="ai-panel__retry" onClick={() => setAttempt((n) => n + 1)}>
              {t("dashboard.ai.retry")}
            </button>
          )}
        </div>
      )}

      {daily && (
        <>
          <div className="ai-panel__posters">
            {daily.slots.map((slot, index) =>
              slot ? (
                <ConnectedSuggestionCard key={movieKey(slot.mediaType, slot.id)} id={slot.id} mediaType={slot.mediaType} title={slot.title} posterPath={slot.posterPath} category={category} />
              ) : (
                <SuggestionRefreshCard key={`refresh-${index}`} loading={refreshing} onRefresh={handleRefresh} />
              )
            )}
          </div>
          {refreshFailed && <p className="ai-panel__basis">{t(quotaHit ? "dashboard.ai.quota" : "dashboard.ai.error")}</p>}
        </>
      )}
    </section>
  );
};

export default AiSuggestionsPanel;
