import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cachedOrFetch } from "./_lib/sharedCache.js";
import { withAvailability } from "./_lib/dashboardData.js";
import { STREAMING_PROVIDERS, fetchTopByProvider, fetchTopOfTheYear, fetchTvHeroTrailers, type DiscoveryKind, type SeriesRowItem } from "./_lib/seriesData.js";

// Uma chamada por grupo de sections da página (`?kind=series&only=hero,top`; sem `only`, todas): o servidor monta as sections pedidas em paralelo
// e responde uma resposta por section,
//   { hero, top, provider-8, provider-119, ... }, cada uma com `{ items }` (cards prontos: imagens, título, ano, id, "disponível")
// ou `{ error }`. Cada section tem o próprio cache compartilhado, então uma falha não derruba as outras.
//   hero          -> trailers do topo (das mais vistas do ano)
//   top           -> "Mais vistas do ano" (ranking de popularidade)
//   provider-<id> -> "Melhor avaliadas no <streaming>" (id do streaming no TMDb)

const ALLOWED_LANGS = new Set(["pt-BR", "en-US", "es-ES"]);
const ROW_LIMIT = 20;
const TOP_OF_YEAR_LIMIT = 20;
const HERO_LIMIT = 5;
const HERO_CANDIDATES = 20; // olha o ranking todo, do topo para baixo, até juntar 5 com trailer

type SectionResult = { items: unknown[] } | { error: string };
const asResult = (items: unknown[] | null, label: string): SectionResult => (items ? { items } : { error: `Não foi possível buscar "${label}" agora.` });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const kind: DiscoveryKind = req.query.kind === "anime" ? "anime" : "series";
  const langParam = typeof req.query.lang === "string" ? req.query.lang : "";
  const lang = ALLOWED_LANGS.has(langParam) ? langParam : "pt-BR";
  const refresh = typeof req.query.refresh === "string" && req.query.refresh !== "" && req.query.refresh !== "0";

  const only = typeof req.query.only === "string" && req.query.only ? req.query.only.split(",") : null;

  // As listas (ranking, trailers e fileiras) usam as mesmas chaves de cache de antes (v2): o que já estava guardado continua valendo.
  // O "disponível" é uma camada por cima, com cache próprio: se falhar, a lista sai igual, só sem o selo.
  const withAvailabilityCached = async (key: string, label: string, list: SeriesRowItem[]) =>
    (await cachedOrFetch(key, label, refresh, () => withAvailability(list, lang))) ?? list.map((item) => ({ ...item, available: false }));

  // a lista das mais vistas do ano alimenta o ranking e o hero: busca uma vez só
  let rankingPromise: ReturnType<typeof cachedOrFetch<SeriesRowItem[]>> | null = null;
  const ranking = () =>
    (rankingPromise ??= cachedOrFetch(`discovery:v2:${kind}:top-of-year:${lang}`, `top do ano (${kind})`, refresh, async () => {
      const list = await fetchTopOfTheYear(kind, TOP_OF_YEAR_LIMIT, lang);
      if (list.length === 0) throw new Error("nenhuma série/anime no ranking do ano");
      return list;
    }));

  const builders: Record<string, { label: string; run: () => Promise<unknown[] | null> }> = {
    // Trailers do topo: das mais vistas do ano. Lista vazia é falha: se vier vazia do cache, busca de novo.
    hero: {
      label: "trailers",
      run: async () => {
        const list = await ranking();
        if (!list) return null;
        const build = async () => {
          const trailers = await fetchTvHeroTrailers(list.slice(0, HERO_CANDIDATES), lang);
          if (trailers.length === 0) throw new Error("nenhuma série com trailer");
          return trailers.slice(0, HERO_LIMIT);
        };
        const key = `discovery:v3:${kind}:hero-trailers:${lang}`;
        const cached = await cachedOrFetch(key, `trailers (${kind})`, refresh, build);
        return cached && cached.length === 0 ? cachedOrFetch(key, `trailers (${kind})`, true, build) : cached;
      },
    },
    top: {
      label: "mais vistas",
      run: async () => {
        const list = await ranking();
        return list ? withAvailabilityCached(`discovery:v4:${kind}:top:${lang}`, `top do ano com disponibilidade (${kind})`, list) : null;
      },
    },
  };
  for (const p of STREAMING_PROVIDERS) {
    builders[`provider-${p.id}`] = {
      label: p.label,
      run: async () => {
        const list = await cachedOrFetch(`discovery:v2:${kind}:provider-${p.id}:${lang}`, `${p.label} (${kind})`, refresh, () => fetchTopByProvider(kind, p.id, ROW_LIMIT, lang));
        return list ? withAvailabilityCached(`discovery:v4:${kind}:provider-${p.id}:${lang}`, `${p.label} com disponibilidade (${kind})`, list) : null;
      },
    };
  }

  const names = Object.keys(builders).filter((name) => !only || only.includes(name));
  const results = await Promise.all(names.map((name) => builders[name].run()));
  const sections: Record<string, SectionResult> = {};
  names.forEach((name, index) => {
    sections[name] = asResult(results[index], builders[name].label);
  });
  const complete = Object.values(sections).every((section) => "items" in section);

  res.setHeader("Cache-Control", complete && !refresh ? "public, s-maxage=600, stale-while-revalidate=3600" : "no-store");
  res.status(200).json(sections);
}
