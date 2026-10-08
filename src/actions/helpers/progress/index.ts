import { episodeAiringInfo, type FollowedSeries } from "@/actions/helpers/followed";

// Filtros de progresso das listas "Minhas séries" e "Meus animes", como aparecem na tela.
export type ProgressFilter = "completed" | "inProgress" | "soon" | "notStarted";
// Filtros de progresso da lista "Minhas séries", na ordem em que aparecem.
// usado em: SeriesRailSection
export const PROGRESS_FILTERS: ProgressFilter[] = ["completed", "inProgress", "soon", "notStarted"];

// Os quatro grupos são EXCLUSIVOS (todo título seguido cai em exatamente um):
//   completed  — todos os episódios vistos (ou em dia e a série foi cancelada)
//   soon       — viu TUDO que já saiu, mas ainda tem episódio por lançar
//   notStarted — nenhum episódio visto
//   inProgress — o resto: viu algum e ainda falta algo que já saiu
// usado em: SeriesRailSection
export const progressGroup = (series: FollowedSeries): ProgressFilter => {
  const episodes = Object.values(series.seasons).flatMap((season) => Object.values(season.episodes));
  const watched = episodes.filter((e) => e.watched).length;
  if (watched === 0) return "notStarted";
  if (watched === episodes.length) return "completed";

  const aired = episodes.filter((e) => episodeAiringInfo(e, series.status).aired);
  const caughtUp = aired.length > 0 && aired.every((e) => e.watched);
  if (caughtUp) return series.status === "Canceled" ? "completed" : "soon";
  return "inProgress";
};
