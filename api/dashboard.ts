import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cachedOrFetch } from "./_lib/sharedCache.js";
import {
  fetchBoxOfficeChampions,
  fetchHeroTrailers,
  fetchIngressoNowPlayingResolved,
  fetchNowPlayingBrazil,
  fetchRecentMajorReleases,
  buildIngressoMovieUrl,
  withAvailability,
  type MovieRowItem,
} from "./_lib/dashboardData.js";

// Uma chamada por grupo de sections da página (`?page=movies&only=hero,nowplaying,boxoffice`; sem `only`, todas): o servidor monta as sections pedidas
// em paralelo e responde uma resposta por section,
//   { hero, nowplaying, boxoffice, releases }, cada uma com `{ items }` (cards prontos: imagens, título, ano, id, "disponível")
// ou `{ error }`. Cada section tem o próprio cache compartilhado, então uma falha não derruba as outras e o que já terminou
// fica guardado mesmo que a chamada demore.
//   hero       -> trailers do topo (dos filmes em cartaz)
//   nowplaying -> "Em cartaz" (da cidade; sem cidade, Brasil)
//   boxoffice  -> ranking de popularidade do ano
//   releases   -> principais lançamentos dos últimos 12 meses

const ALLOWED_LANGS = new Set(["pt-BR", "en-US", "es-ES"]);
const ROW_LIMIT = 8;
const BOX_OFFICE_LIMIT = 20;
const RELEASES_LIMIT = 120;
const INGRESSO_LIMIT = 40;
const HERO_CANDIDATES = 12;
const HERO_LIMIT = 5;

const nowPlayingMovies = async (city: string | null, lang: string): Promise<MovieRowItem[]> => {
  if (city) {
    try {
      return await withAvailability(await fetchIngressoNowPlayingResolved(city, INGRESSO_LIMIT, lang), lang);
    } catch (err) {
      console.error("Erro ao buscar em cartaz do ingresso.com, caindo pro TMDb:", err);
    }
  }

  const fallback = await fetchNowPlayingBrazil(ROW_LIMIT, lang);
  return withAvailability(
    fallback.map((movie) => ({
      id: movie.id,
      mediaType: movie.mediaType,
      title: movie.title,
      year: movie.year,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      href: buildIngressoMovieUrl(movie.title),
      rankLabel: "Comprar ingresso",
    })),
    lang
  );
};

type SectionResult = { items: unknown[] } | { error: string };
const asResult = (items: unknown[] | null, label: string): SectionResult => (items ? { items } : { error: `Não foi possível buscar "${label}" agora.` });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const langParam = typeof req.query.lang === "string" ? req.query.lang : "";
  const lang = ALLOWED_LANGS.has(langParam) ? langParam : "pt-BR";
  const city = typeof req.query.city === "string" && req.query.city.trim() ? req.query.city.trim() : null;
  const refresh = req.query.refresh === "1" || req.query.refresh === "true";

  if (req.query.page !== "movies") {
    res.status(400).json({ error: "Página inválida." });
    return;
  }

  const place = city ?? "brasil";
  const only = typeof req.query.only === "string" && req.query.only ? req.query.only.split(",") : null;

  const nowPlaying = () => cachedOrFetch(`dashboard:v4:now-playing:${lang}:${place}`, "em cartaz", refresh, () => nowPlayingMovies(city, lang));

  const builders: Record<string, { label: string; run: () => Promise<unknown[] | null> }> = {
    // Trailers do topo: os filmes em cartaz no Brasil (uma consulta só, não depende da cidade nem do "disponível"), os primeiros candidatos
    // e até 5 com trailer. Lista vazia é falha (não vai para o cache), para um problema passageiro não prender o hero por dias.
    hero: {
      label: "trailers",
      run: () =>
        cachedOrFetch(`dashboard:v5:hero:${lang}`, "trailers", refresh, async () => {
          const trailers = await fetchHeroTrailers(await fetchNowPlayingBrazil(HERO_CANDIDATES, lang), lang);
          if (trailers.length === 0) throw new Error("nenhum filme em cartaz com trailer");
          return trailers.slice(0, HERO_LIMIT);
        }),
    },
    nowplaying: { label: "em cartaz", run: nowPlaying },
    boxoffice: {
      label: "bilheteria",
      run: () => cachedOrFetch(`dashboard:v4:box-office:${lang}`, "bilheteria", refresh, async () => withAvailability(await fetchBoxOfficeChampions(BOX_OFFICE_LIMIT, lang), lang)),
    },
    releases: { label: "lançamentos", run: () => cachedOrFetch(`dashboard:v4:releases:${lang}`, "principais lançamentos", refresh, () => fetchRecentMajorReleases(RELEASES_LIMIT, lang)) },
  };

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
