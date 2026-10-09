// Simula o TMDb (e derruba /api/*) no Storybook, pra os componentes que buscam dados abrirem sem rede nem chave.
import { BACKDROPS, HERO_TRAILERS, MEDIA_ITEMS, MOVIES, POSTERS, RELEASES, SERIES } from "./fixtures";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const titleOf = (id: number) => [...MOVIES, ...SERIES].find((m) => m.id === id);

const detail = (kind: "movie" | "tv", id: number) => {
  const known = titleOf(id);
  const title = known?.title ?? "Título de exemplo";
  return {
    id,
    title,
    name: title,
    original_title: title,
    original_name: title,
    tagline: "Uma frase de efeito para o título.",
    overview: "Sinopse de exemplo: uma história sobre sonhos dentro de sonhos, escolhas difíceis e o preço de cada decisão.",
    poster_path: known?.posterPath ?? POSTERS.inception,
    backdrop_path: known?.backdropPath ?? BACKDROPS.inception,
    release_date: "2010-07-16",
    first_air_date: "2008-01-20",
    runtime: 148,
    number_of_seasons: 5,
    number_of_episodes: 62,
    genres: [
      { id: 28, name: "Ação" },
      { id: 878, name: "Ficção científica" },
    ],
    vote_average: known?.voteAverage ?? 8.4,
    vote_count: 35000,
    status: kind === "tv" ? "Ended" : "Released",
    created_by: [{ id: 1, name: "Vince Gilligan" }],
    credits: {
      cast: [
        { id: 6193, name: "Leonardo DiCaprio", character: "Cobb", profile_path: null },
        { id: 24045, name: "Joseph Gordon-Levitt", character: "Arthur", profile_path: null },
        { id: 27578, name: "Elliot Page", character: "Ariadne", profile_path: null },
      ],
      crew: [{ id: 525, name: "Christopher Nolan", job: "Director" }],
    },
    videos: { results: [{ key: "YoHD9XEInc0", site: "YouTube", type: "Trailer", official: true, name: "Trailer" }] },
  };
};

const providers = {
  results: {
    BR: {
      link: "https://www.themoviedb.org/",
      flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" }],
      rent: [{ provider_id: 2, provider_name: "Apple TV", logo_path: "/peURlLlr8jggOwK53fJ5wdQl05y.jpg" }],
      buy: [],
    },
  },
};

const handleTmdb = (url: URL): Response => {
  const path = url.pathname.replace(/^\/3/, "");
  if (/\/watch\/providers$/.test(path)) return json(providers);
  if (/\/videos$/.test(path)) return json(detail("movie", 0).videos);
  if (path.startsWith("/search/")) {
    return json({ results: MOVIES.map((m) => ({ id: m.id, media_type: "movie", title: m.title, name: m.title, poster_path: m.posterPath })) });
  }
  const match = /^\/(movie|tv)\/(\d+)$/.exec(path);
  if (match) return json(detail(match[1] as "movie" | "tv", Number(match[2])));
  return json({ results: [] });
};

// Cards como o backend entrega: já com ano e "disponível".
const seriesCards = SERIES.map((m, index) => ({ id: m.id, mediaType: "tv", title: m.title, year: "2008", posterPath: m.posterPath, backdropPath: null, available: index % 2 === 0 }));

// Uma resposta por página, com uma entrada por section (como o backend entrega).
const handleBackend = (url: URL): Response => {
  const endpoint = url.pathname.replace("/api/", "");
  if (endpoint === "dashboard") {
    return json({ hero: { items: HERO_TRAILERS }, nowplaying: { items: MEDIA_ITEMS }, boxoffice: { items: MOVIES }, releases: { items: RELEASES } });
  }
  if (endpoint === "series") {
    const providers = Object.fromEntries([8, 119, 337, 1899, 307, 350].map((id) => ["provider-" + id, { items: seriesCards }]));
    return json({ hero: { items: HERO_TRAILERS }, top: { items: seriesCards }, ...providers });
  }
  if (endpoint === "suggestions") {
    const slots = MOVIES.slice(0, 3).map((m) => ({ id: m.id, mediaType: "movie", title: m.title, posterPath: m.posterPath, available: true }));
    return json({ status: "ok", basis: "ratings", slots });
  }
  return json({ error: "Endpoint indisponível no Storybook" }, 503);
};

let installed = false;

export const installFetchMock = (): void => {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    if (url.hostname === "api.themoviedb.org") return handleTmdb(url);
    if (url.pathname.startsWith("/api/")) return handleBackend(url);
    return realFetch(input, init);
  };
};
