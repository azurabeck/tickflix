import { usePageDashboard } from "@/actions/helpers/section";

// Dashboard da página Filmes: um pedido ao backend com tudo da página (Hero, Em cartaz, Popularidade e Lançamentos) e uma leitura do Firebase.
// "Em cartaz" e o Hero são da cidade do usuário.
// usado em: presentation/cyclerender, página Filmes
export const useMoviesDashboard = () => usePageDashboard("movies", { endpoint: "dashboard", params: { page: "movies" }, groups: [["hero"], ["nowplaying", "boxoffice"], ["releases"]], city: true, timelineType: "filmes", mediaKind: "movie" });
