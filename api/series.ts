// api/series.ts
// Função serverless (Vercel) — descoberta das páginas Séries e Animes
// (fileiras por streaming, "Top 20 do ano" e trailers do topo) já
// resolvida, lida de um cache COMPARTILHADO no Firestore
// (api/_lib/sharedCache.ts, 7 dias). Mesmo raciocínio de api/dashboard.ts.
//
// GET /api/series?kind=series|anime&lang=pt-BR&refresh=<qualquer valor>
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cachedOrFetch } from "./_lib/sharedCache.js";
import type { HeroTrailer } from "./_lib/dashboardData.js";
import {
  STREAMING_PROVIDERS,
  fetchTopByProvider,
  fetchTopOfTheYear,
  fetchTvHeroTrailers,
  type DiscoveryKind,
  type SeriesRowItem,
} from "./_lib/seriesData.js";

const ALLOWED_LANGS = new Set(["pt-BR", "en-US", "es-ES"]);
const ROW_LIMIT = 20;
const TOP_OF_YEAR_LIMIT = 20;
const HERO_LIMIT = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const kind: DiscoveryKind = req.query.kind === "anime" ? "anime" : "series";
  const langParam = typeof req.query.lang === "string" ? req.query.lang : "";
  const lang = ALLOWED_LANGS.has(langParam) ? langParam : "pt-BR";
  const forceRefresh = typeof req.query.refresh === "string" && req.query.refresh !== "" && req.query.refresh !== "0";

  const topOfYearPromise = cachedOrFetch<SeriesRowItem[]>(`discovery:v2:${kind}:top-of-year:${lang}`, `top do ano (${kind})`, forceRefresh, () =>
    fetchTopOfTheYear(kind, TOP_OF_YEAR_LIMIT, lang)
  );

  // Os trailers saem dos primeiros itens do MESMO "top do ano" (o
  // carrossel e a fileira usam o mesmo critério, só `limit` diferente) —
  // reaproveita em vez de rodar a descoberta duas vezes.
  const heroPromise = (async (): Promise<HeroTrailer[] | null> => {
    const topOfYear = await topOfYearPromise;
    if (!topOfYear) return null;
    return cachedOrFetch<HeroTrailer[]>(`discovery:v2:${kind}:hero-trailers:${lang}`, `trailers (${kind})`, forceRefresh, () =>
      fetchTvHeroTrailers(topOfYear.slice(0, HERO_LIMIT), lang)
    );
  })();

  const providerPromises = STREAMING_PROVIDERS.map((provider) =>
    cachedOrFetch<SeriesRowItem[]>(`discovery:v2:${kind}:provider-${provider.id}:${lang}`, `${provider.label} (${kind})`, forceRefresh, () =>
      fetchTopByProvider(kind, provider.id, ROW_LIMIT, lang)
    )
  );

  const [topOfYear, heroTrailers, ...providerResults] = await Promise.all([topOfYearPromise, heroPromise, ...providerPromises]);

  const providers: Record<string, SeriesRowItem[] | null> = {};
  STREAMING_PROVIDERS.forEach((provider, index) => {
    providers[String(provider.id)] = providerResults[index];
  });

  // Mesma regra do dashboard: CDN só em resposta completa e sem refresh.
  const complete = topOfYear !== null && heroTrailers !== null && providerResults.every((r) => r !== null);
  res.setHeader("Cache-Control", complete && !forceRefresh ? "public, s-maxage=600, stale-while-revalidate=3600" : "no-store");
  res.status(200).json({ providers, topOfYear, heroTrailers: heroTrailers ?? [] });
}
