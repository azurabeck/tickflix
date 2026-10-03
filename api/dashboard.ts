// api/dashboard.ts
// Função serverless (Vercel) — devolve os dados pesados da Home (em
// cartaz, bilheteria, principais lançamentos, trailers do topo) já
// resolvidos, lendo de um cache COMPARTILHADO no Firestore
// (api/_lib/sharedCache.ts, 7 dias) em vez de cada navegador refazer
// essas dezenas/centenas de chamadas no TMDb sozinho. Pedido explícito
// da Rebecca: "a gente ta pegando isso toda vez... o certo era a gente
// ter a chamada do tmdb, quando a resposta... e aí as sessões são
// basicamente filtros" — na prática do dashboard (sem filtro nenhum por
// usuário, só por cidade/idioma), "filtro" aqui é city+lang: a maioria
// das visitas cai em cache HIT (uma leitura no Firestore, nenhuma
// chamada ao TMDb) em vez de reconstruir a lista do zero.
//
// GET /api/dashboard?lang=pt-BR&city=sao-paulo&refresh=0
//   lang: pt-BR | en-US | es-ES (mesmo valor de TMDB_LANGUAGE_BY_APP_LANGUAGE, src/service/i18n.ts)
//   city: slug do ingresso.com pra "em cartaz" (já resolvido no client via geolocation — o
//         backend não faz geolocation nenhuma, só lê a página do ingresso.com pra ESSA cidade)
//   refresh: "1" força ignorar o cache (botão "Atualizar" do UserMenu)
//   part: "main" (padrão: em cartaz + trailers + bilheteria) | "releases" (os 120 lançamentos do "Ver tudo", bem mais pesado)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cachedOrFetch } from "./_lib/sharedCache.js";
import {
  fetchBoxOfficeChampions,
  fetchHeroTrailers,
  fetchIngressoNowPlayingResolved,
  fetchNowPlayingBrazil,
  fetchRecentMajorReleases,
  buildIngressoMovieUrl,
  type DashboardMovie,
  type HeroTrailer,
  type MajorReleaseMovie,
  type MovieRowItem,
} from "./_lib/dashboardData.js";

const ALLOWED_LANGS = new Set(["pt-BR", "en-US", "es-ES"]);
const ROW_LIMIT = 8;
const BOX_OFFICE_LIMIT = 20;
const MAJOR_RELEASES_MODAL_LIMIT = 120;
const INGRESSO_LIMIT = 40;

interface NowPlayingPayload {
  movies: MovieRowItem[];
  heroTrailers: HeroTrailer[];
}

const resolveNowPlaying = async (city: string | null, lang: string): Promise<NowPlayingPayload> => {
  if (city) {
    try {
      const movies = await fetchIngressoNowPlayingResolved(city, INGRESSO_LIMIT, lang);
      const withId = movies.filter((m): m is MovieRowItem & { id: number } => m.id !== undefined);
      const heroTrailers = await fetchHeroTrailers(withId, lang);
      return { movies, heroTrailers };
    } catch (err) {
      console.error("Erro ao buscar em cartaz do ingresso.com, caindo pro TMDb:", err);
    }
  }

  const fallback = await fetchNowPlayingBrazil(ROW_LIMIT, lang);
  const movies: MovieRowItem[] = fallback.map((movie) => ({
    id: movie.id,
    mediaType: movie.mediaType,
    title: movie.title,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    href: buildIngressoMovieUrl(movie.title),
    rankLabel: "Comprar ingresso",
  }));
  const withId = movies.filter((m): m is MovieRowItem & { id: number } => m.id !== undefined);
  const heroTrailers = await fetchHeroTrailers(withId, lang);
  return { movies, heroTrailers };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const langParam = typeof req.query.lang === "string" ? req.query.lang : "";
  const lang = ALLOWED_LANGS.has(langParam) ? langParam : "pt-BR";
  const city = typeof req.query.city === "string" && req.query.city.trim() ? req.query.city.trim() : null;
  const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true";

  // `part` separa o que é rápido do que é pesado — antes tudo vinha numa
  // resposta só, então a Home esperava os 120 lançamentos (a parte de
  // ~35s com cache frio) mesmo só precisando de "em cartaz"/bilheteria
  // pra mostrar a página. O client chama as duas partes em paralelo e
  // só trava o load geral na "main".
  const part = req.query.part === "releases" ? "releases" : "main";

  // Cache de CDN (Vercel) só em resposta COMPLETA e sem `refresh=1` —
  // a maioria das visitas é servida da borda sem nem invocar a função
  // (nem ler o Firestore). `refresh=1` (botão "Atualizar") e qualquer
  // falha ficam `no-store`, pra nunca congelar um erro nem uma lista
  // velha na CDN. 10 min: curto o bastante pro "Atualizar" aparecer logo
  // pra quem entra depois, sem perder o ganho.
  const setCacheHeader = (complete: boolean) =>
    res.setHeader("Cache-Control", complete && !forceRefresh ? "public, s-maxage=600, stale-while-revalidate=3600" : "no-store");

  if (part === "releases") {
    const majorReleasesFull = await cachedOrFetch<MajorReleaseMovie[]>(`dashboard:v2:major-releases-full:${lang}`, "principais lançamentos", forceRefresh,
      () => fetchRecentMajorReleases(MAJOR_RELEASES_MODAL_LIMIT, lang)
    );
    setCacheHeader(majorReleasesFull !== null);
    res.status(200).json({ majorReleasesFull, majorReleasesFailed: majorReleasesFull === null });
    return;
  }

  const [nowPlayingPayload, boxOffice] = await Promise.all([
    cachedOrFetch<NowPlayingPayload>(`dashboard:v2:now-playing:${lang}:${city ?? "brasil"}`, "em cartaz", forceRefresh, () => resolveNowPlaying(city, lang)),
    cachedOrFetch<DashboardMovie[]>(`dashboard:v2:box-office:${lang}`, "bilheteria", forceRefresh, () => fetchBoxOfficeChampions(BOX_OFFICE_LIMIT, lang)),
  ]);

  setCacheHeader(nowPlayingPayload !== null && boxOffice !== null);
  res.status(200).json({
    nowPlaying: nowPlayingPayload?.movies ?? null,
    nowPlayingFailed: nowPlayingPayload === null,
    heroTrailers: nowPlayingPayload?.heroTrailers ?? [],
    boxOffice,
    boxOfficeFailed: boxOffice === null,
  });
}
