import { useState } from "react";
import { episodeAiringInfo, fetchSeasonEpisodes, type FollowedSeason, type FollowedSeries } from "@/actions/helpers/followed";

// Detalhe de uma série/anime seguido (modal aberto de qualquer página): temporadas, progresso e descrição dos episódios.

// ---------- temporadas e progresso ----------

// Temporadas/episódios vêm como chave string (mapa do Firestore): ordena numericamente.
// usado em: SeasonItem, SeriesDetail
export const sortedNumberKeys = (record: Record<string, unknown>): number[] =>
  Object.keys(record)
    .map(Number)
    .sort((a, b) => a - b);

// Episódios vistos e total de uma temporada.
// usado em: SeasonItem
export const seasonProgress = (season: FollowedSeason): { watched: number; total: number } => {
  const episodes = Object.values(season.episodes);
  return { watched: episodes.filter((e) => e.watched).length, total: episodes.length };
};

// Só os episódios já lançados contam pro "tá tudo marcado?" do botão de temporada inteira.
// usado em: SeasonItem
export const seasonAiredProgress = (season: FollowedSeason, seriesStatus: string): { watched: number; total: number } => {
  const aired = Object.values(season.episodes).filter((e) => episodeAiringInfo(e, seriesStatus).aired);
  return { watched: aired.filter((e) => e.watched).length, total: aired.length };
};

// A primeira temporada com episódios por ver (ou a primeira) começa aberta.
// usado em: SeriesDetail
export const firstUnfinishedSeason = (series: FollowedSeries): number | undefined => {
  const numbers = sortedNumberKeys(series.seasons);
  return (
    numbers.find((n) => {
      const { watched, total } = seasonProgress(series.seasons[String(n)]);
      return total > 0 && watched < total;
    }) ?? numbers[0]
  );
};

// Os episódios já lançados de uma temporada e se todos estão vistos (pro "marcar temporada inteira").
// usado em: SeriesDetail
export const airedEpisodesOf = (season: FollowedSeason, seriesStatus: string): { numbers: number[]; allWatched: boolean } => {
  const numbers = sortedNumberKeys(season.episodes).filter((ep) => episodeAiringInfo(season.episodes[String(ep)], seriesStatus).aired);
  return { numbers, allWatched: numbers.every((ep) => season.episodes[String(ep)].watched) };
};

// ---------- descrição de um episódio ----------

type OverviewState = { status: "idle" } | { status: "loading" } | { status: "ready"; text: string } | { status: "error" };

// Uma chamada por temporada: abrir vários episódios da mesma temporada reaproveita a resposta.
const overviewMemo = new Map<string, Promise<Record<number, string>>>();

const fetchEpisodeOverviews = (seriesId: number, seasonNumber: number): Promise<Record<number, string>> => {
  const memoKey = `${seriesId}-${seasonNumber}`;
  const existing = overviewMemo.get(memoKey);
  if (existing) return existing;

  const request = fetchSeasonEpisodes(seriesId, seasonNumber)
    .then((episodes) => {
      const overviews: Record<number, string> = {};
      for (const ep of episodes) overviews[ep.episode_number] = (ep.overview ?? "").trim();
      return overviews;
    })
    .catch((err) => {
      overviewMemo.delete(memoKey);
      throw err;
    });
  overviewMemo.set(memoKey, request);
  return request;
};

// Ciclo "ver a descrição do episódio": abre/fecha o texto e busca na primeira vez.
// usado em: EpisodeRow
export const useEpisodeOverview = (seriesId: number, seasonNumber: number, episodeNumber: number) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<OverviewState>({ status: "idle" });

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (state.status === "ready" || state.status === "loading") return;

    setState({ status: "loading" });
    fetchEpisodeOverviews(seriesId, seasonNumber)
      .then((bySeason) => setState({ status: "ready", text: bySeason[episodeNumber] ?? "" }))
      .catch((err) => {
        console.error("Erro ao buscar a descrição do episódio:", err);
        setState({ status: "error" });
      });
  };

  return { open, state, toggle };
};
