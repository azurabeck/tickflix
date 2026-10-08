// Dados de exemplo compartilhados pelas stories (nada aqui fala com a rede).
import type { AwardCategory, AwardEdition } from "@/actions/awards/editions";
import type { FollowedSeries } from "@/actions/helpers/followed";
import type { MovieDetail, WatchProviders } from "@/actions/helpers/moviedetail";
import type { Timeline, TimelineMovie } from "@/actions/helpers/timelines";
import type { DashboardMovie, HeroTrailer, MajorReleaseMovie, MediaItem, RankItem } from "@/types/media";

export const POSTERS = {
  inception: "/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg",
  interstellar: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  darkKnight: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  fightClub: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  pulpFiction: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  parasite: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
};

export const BACKDROPS = {
  inception: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
  interstellar: "/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
  fightClub: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
};

const RAW_MOVIES: DashboardMovie[] = [
  { id: 27205, mediaType: "movie", title: "A Origem", posterPath: POSTERS.inception, backdropPath: BACKDROPS.inception, voteAverage: 8.4 },
  { id: 157336, mediaType: "movie", title: "Interestelar", posterPath: POSTERS.interstellar, backdropPath: BACKDROPS.interstellar, voteAverage: 8.5 },
  { id: 155, mediaType: "movie", title: "Batman: O Cavaleiro das Trevas", posterPath: POSTERS.darkKnight, voteAverage: 8.5 },
  { id: 550, mediaType: "movie", title: "Clube da Luta", posterPath: POSTERS.fightClub, backdropPath: BACKDROPS.fightClub, voteAverage: 8.4 },
  { id: 680, mediaType: "movie", title: "Pulp Fiction", posterPath: POSTERS.pulpFiction, voteAverage: 8.5 },
  { id: 496243, mediaType: "movie", title: "Parasita", posterPath: POSTERS.parasite, voteAverage: 8.5 },
];

// Como o backend entrega: cada card já com ano e "disponível".
export const MOVIES: DashboardMovie[] = RAW_MOVIES.map((movie, index) => ({ ...movie, year: "2010", available: index % 2 === 0 }));

export const SERIES: DashboardMovie[] = [
  { id: 1396, mediaType: "tv", title: "Breaking Bad", posterPath: POSTERS.pulpFiction, voteAverage: 8.9 },
  { id: 66732, mediaType: "tv", title: "Stranger Things", posterPath: POSTERS.fightClub, voteAverage: 8.6 },
  { id: 1399, mediaType: "tv", title: "Game of Thrones", posterPath: POSTERS.darkKnight, voteAverage: 8.5 },
];

export const MEDIA_ITEMS: MediaItem[] = MOVIES.map(({ id, mediaType, title, posterPath, backdropPath, year, available }) => ({ id, mediaType, title, posterPath, backdropPath, year, available }));

export const RELEASES: MajorReleaseMovie[] = MOVIES.map((movie, index) => ({
  ...movie,
  available: index % 2 === 0,
  releaseDate: index < 3 ? "2026-10-15" : "2026-09-20",
}));

export const HERO_TRAILERS: HeroTrailer[] = [
  { id: 27205, title: "A Origem", youtubeKey: "YoHD9XEInc0", isDubbed: true },
  { id: 157336, title: "Interestelar", youtubeKey: "zSWdZVtXT7E", isDubbed: false },
];

export const RANK_ITEMS: RankItem[] = MOVIES.slice(0, 5).map((movie, index) => ({
  key: `movie-${movie.id}`,
  id: movie.id,
  mediaType: "movie",
  type: "movie",
  title: movie.title,
  rating: index === 0 ? 9.5 : index === 1 ? 8 : null,
  checked: index < 2,
  available: index % 2 === 0,
  card: movie,
}));

const timelineMovies = (movies: DashboardMovie[]): TimelineMovie[] =>
  movies.map((movie, index) => ({
    id: movie.id,
    mediaType: movie.mediaType,
    title: movie.title,
    year: "2010",
    posterPath: movie.posterPath,
    watched: index < 2,
    watchedAt: index < 2 ? Date.now() : null,
  }));

export const TIMELINES: Timeline[] = [
  { id: "t1", name: "Filmes do Christopher Nolan", types: ["filmes"], movies: timelineMovies(MOVIES.slice(0, 4)), createdAt: null, followed: true },
  { id: "t2", name: "Maratona de crime", types: ["filmes", "series"], movies: timelineMovies([...MOVIES.slice(3, 5), ...SERIES.slice(0, 1)]), createdAt: null },
  { id: "franchise-marvel", name: "Marvel", types: ["filmes", "series"], movies: timelineMovies(MOVIES.slice(2, 6)), createdAt: null, franchiseSlug: "marvel", followed: true },
];

export const watchedKeysOf = (timeline: Timeline): Map<string, number> =>
  new Map(timeline.movies.filter((m) => m.watched).map((m) => [`${m.mediaType}-${m.id}`, m.watchedAt ?? 0]));

export const FOLLOWED_SERIES: FollowedSeries = {
  id: 1396,
  title: "Breaking Bad",
  posterPath: POSTERS.pulpFiction,
  addedAt: Date.now(),
  totalSeasons: 2,
  status: "Ended",
  category: "series",
  seasons: {
    "1": {
      name: "Temporada 1",
      episodes: {
        "1": { name: "Piloto", watched: true, airDate: "2008-01-20" },
        "2": { name: "O Gato Está na Bolsa...", watched: true, airDate: "2008-01-27" },
        "3": { name: "...E a Bolsa Está no Rio", watched: false, airDate: "2008-02-10" },
      },
    },
    "2": {
      name: "Temporada 2",
      episodes: {
        "1": { name: "Sete Trinta e Sete", watched: false, airDate: "2009-03-08" },
        "2": { name: "Grilado", watched: false, airDate: "2009-03-15" },
        "3": { name: "Episódio futuro", watched: false, airDate: "2999-01-01" },
      },
    },
  },
};

const nominee = (movie: DashboardMovie, isWinner: boolean, personName?: string) => ({
  filmTitle: movie.title,
  filmYear: 2020,
  posterPath: movie.posterPath,
  isWinner,
  personName,
  tmdbId: movie.id,
  mediaType: "movie" as const,
});

export const AWARD_CATEGORIES: AwardCategory[] = [
  { name: "Melhor Filme", nominees: [nominee(MOVIES[5], true), nominee(MOVIES[0], false), nominee(MOVIES[1], false)] },
  { name: "Melhor Diretor", nominees: [nominee(MOVIES[5], true, "Bong Joon-ho"), nominee(MOVIES[0], false, "Christopher Nolan")] },
];

export const AWARD_EDITIONS: AwardEdition[] = [
  { ordinal: 92, ceremonyYear: 2020, filmYear: "2019", headline: "Parasita", categories: AWARD_CATEGORIES },
  { ordinal: 93, ceremonyYear: 2021, filmYear: "2020", headline: null, categories: null },
  { ordinal: 94, ceremonyYear: 2022, filmYear: "2021", headline: null, categories: null },
];

export const MOVIE_DETAIL: MovieDetail = {
  id: 27205,
  mediaType: "movie",
  title: "A Origem",
  originalTitle: "Inception",
  tagline: "Seu sonho é o seu mundo.",
  overview: "Dom Cobb é um ladrão capaz de roubar segredos do inconsciente das pessoas enquanto elas sonham. Agora ele recebe a missão inversa: implantar uma ideia.",
  posterPath: POSTERS.inception,
  backdropPath: BACKDROPS.inception,
  releaseDate: "2010-07-16",
  runtimeMinutes: 148,
  seasons: null,
  episodes: null,
  genres: ["Ação", "Ficção científica", "Aventura"],
  voteAverage: 8.4,
  voteCount: 35000,
  status: "Released",
  directors: ["Christopher Nolan"],
  cast: [
    { id: 6193, name: "Leonardo DiCaprio", character: "Cobb", profilePath: null },
    { id: 24045, name: "Joseph Gordon-Levitt", character: "Arthur", profilePath: null },
    { id: 27578, name: "Elliot Page", character: "Ariadne", profilePath: null },
  ],
  trailerKey: "YoHD9XEInc0",
};

export const WATCH_PROVIDERS: WatchProviders = {
  countryCode: "BR",
  link: "https://www.themoviedb.org/",
  flatrate: [{ id: 8, name: "Netflix", logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" }],
  rent: [{ id: 2, name: "Apple TV", logoPath: "/peURlLlr8jggOwK53fJ5wdQl05y.jpg" }],
  buy: [],
};
