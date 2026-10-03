// src/pages/private/series/useDiscovery.ts
// Descoberta das páginas Séries e Animes (fileiras por streaming, "Top 20
// do ano" e trailers do topo) vinda do backend (api/series.ts), que lê de
// um cache COMPARTILHADO no Firestore em vez de cada navegador refazer
// dezenas de chamadas no TMDb. As duas páginas eram o mesmo código com a
// condição de anime invertida — `kind` escolhe qual.
//
// Mesmo padrão da Home (@/pages/private/home/dashboard/index.tsx): cópia
// local da resposta (service/PageCache.ts, 7 dias) lida UMA vez no mount
// pros estados já nascerem preenchidos — sair da página e voltar não
// refaz o load geral nem pisca o PageLoader.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { consumeRefreshRequest, getPageCache, setPageCache } from "@/service/PageCache";
import { TMDB_LANGUAGE_BY_APP_LANGUAGE, type SupportedLanguage } from "@/service/i18n";
import type { HeroTrailer } from "@/pages/private/home/dashboard/functions";
import { STREAMING_PROVIDERS, type SeriesRowItem } from "./functions";

export type DiscoveryKind = "series" | "anime";

// Formato de GET /api/series (api/series.ts) — `null` numa fileira = falhou.
interface DiscoveryResponse {
  providers: Record<string, SeriesRowItem[] | null>;
  topOfYear: SeriesRowItem[] | null;
  heroTrailers: HeroTrailer[];
}

const LOAD_ERROR = "Não foi possível carregar agora.";

export const useDiscovery = (kind: DiscoveryKind, uid: string | null, mergeAvailability: (items: { id: number }[]) => void) => {
  const { i18n } = useTranslation();
  const lang = TMDB_LANGUAGE_BY_APP_LANGUAGE[(i18n.language ?? "pt").slice(0, 2) as SupportedLanguage] ?? "pt-BR";
  const cacheKey = `discovery-${kind}:v2:${lang}`;

  const [initialCache] = useState(() => (uid ? getPageCache<DiscoveryResponse>(uid, cacheKey) : null));
  const [data, setData] = useState<DiscoveryResponse | null>(initialCache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mergeAll = (response: DiscoveryResponse) => {
      for (const items of Object.values(response.providers)) if (items) mergeAvailability(items);
      if (response.topOfYear) mergeAvailability(response.topOfYear);
    };

    const run = async () => {
      // "Atualizar" no UserMenu (service/PageCache.ts) — pede `refresh=1`
      // ao backend, que ignora o cache compartilhado dele.
      const forceRefresh = consumeRefreshRequest(kind);

      if (initialCache && !forceRefresh) {
        mergeAll(initialCache);
        return;
      }

      try {
        const params = new URLSearchParams({ kind, lang });
        if (forceRefresh) params.set("refresh", "1");
        const response = await fetch(`/api/series?${params.toString()}`);
        if (!response.ok) throw new Error(`API respondeu ${response.status}`);
        const fresh = (await response.json()) as DiscoveryResponse;

        setData(fresh);
        mergeAll(fresh);

        const complete = fresh.topOfYear !== null && Object.values(fresh.providers).every((items) => items !== null);
        if (uid && complete) setPageCache(uid, cacheKey, fresh);
      } catch (err) {
        console.error(`Erro ao buscar descoberta de ${kind} (backend):`, err);
        setFailed(true);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providerRows: Record<number, SeriesRowItem[]> = {};
  const providerErrors: Record<number, string> = {};
  for (const provider of STREAMING_PROVIDERS) {
    const items = data?.providers[String(provider.id)];
    if (items) providerRows[provider.id] = items;
    else if (data || failed) providerErrors[provider.id] = LOAD_ERROR;
  }

  return {
    providerRows,
    providerErrors,
    topOfYear: data?.topOfYear ?? null,
    topOfYearError: data?.topOfYear === null || failed ? LOAD_ERROR : null,
    heroTrailers: data?.heroTrailers ?? [],
    pageReady: data !== null || failed,
  };
};
