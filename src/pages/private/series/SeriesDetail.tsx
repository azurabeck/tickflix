// src/pages/private/series/SeriesDetail.tsx
// Dialog que abre ao clicar num card de "Minhas séries" (ou num pôster
// de série já seguida em qualquer lugar da página, ver handlePosterClick
// em index.tsx) — pedido explícito da Rebecca: "quando eu adicionar uma
// série eu posso marcar quais episódios eu já assisti daquela série".
//
// Reusa a MESMA sinopse/elenco/onde-assistir do
// @/components/movieDetail genérico — pedido explícito da Rebecca depois
// de ver a primeira versão (só título+progresso+temporadas): "vc tirou
// os detalhes... mantenha, deixa o modal scrollar e então começa a parte
// de selecionar os capítulos... e aí joga a informação restantes abaixo
// da lista de capítulos". Ordem final do modal: backdrop/pôster/sinopse
// (`MovieDetailHeader`) → progresso + acordeão de temporadas (só daqui)
// → elenco + onde assistir (`MovieDetailCast`/`MovieDetailProviders`,
// mesmas peças do modal genérico). Busca detail/providers no TMDb igual
// o `MovieDetail` faz (mesmas funções de `components/movieDetail/functions.ts`)
// — só a lista de episódios em si não é buscada aqui, ela já vem pronta
// no doc (`series.seasons`, gravado no momento de seguir, ver
// fetchSeriesWithEpisodes em functions.ts).
//
// Lista de episódios por temporada é um ACORDEÃO (pedido explícito da
// Rebecca: "uma lista de capítulos colapsável, que eu posso marcar o
// capítulo inteiro, ou se abrir eu posso marcar um por 1") — o cabeçalho
// de cada temporada, mesmo FECHADO, já tem um botão pra marcar/desmarcar
// a temporada inteira de uma vez; expandir revela episódio por episódio.
// Episódio ainda não lançado (`episodeAiringInfo`,
// service/FollowingSettings.ts) fica com opacidade reduzida e sem
// checkbox — mostra a data de estreia, "Aguardando data" (TMDb ainda não
// agendou) ou "Cancelado" (série com esse status), no lugar de deixar
// marcar como visto algo que não existe ainda.
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { MovieDetailCast, MovieDetailHeader, MovieDetailProviders } from "@/components/movieDetail";
import { fetchMovieDetail, fetchWatchProviders, type MovieDetail as MovieDetailData, type WatchProviders } from "@/components/movieDetail/functions";
import { fetchCurrentLocation } from "@/service/LocationSettings";
import {
  episodeAiringInfo,
  followedSeriesProgress,
  type FollowedSeason,
  type FollowedSeries,
} from "@/service/FollowingSettings";
import { progressPercent } from "@/service/TimelineSettings";
import "./styles.scss";

interface SeriesDetailProps {
  series: FollowedSeries;
  uid: string | null;
  onClose: () => void;
  onToggleEpisode: (series: FollowedSeries, season: number, episode: number) => void;
  onToggleSeason: (series: FollowedSeries, season: number, episodes: number[], watched: boolean) => void;
}

// Mesmo fallback de país usado no @/components/movieDetail (sem
// localização, assume Brasil).
const DEFAULT_COUNTRY_CODE = "BR";

// Temporadas/episódios vêm como chave string (mapa do Firestore) —
// ordena numericamente (não a ordem de inserção/alfabética, que
// quebraria a partir do número 10).
const sortedNumberKeys = (record: Record<string, unknown>): number[] =>
  Object.keys(record)
    .map(Number)
    .sort((a, b) => a - b);

const seasonProgress = (season: FollowedSeason): { watched: number; total: number } => {
  const episodes = Object.values(season.episodes);
  return { watched: episodes.filter((e) => e.watched).length, total: episodes.length };
};

// Só episódios já lançados contam pro "tá tudo marcado?" do botão de
// temporada inteira — diferente de seasonProgress (que soma TODOS os
// episódios, lançados ou não, pra dar o sentido real de "quanto falta da
// temporada inteira" na barra de progresso).
const seasonAiredProgress = (season: FollowedSeason, seriesStatus: string): { watched: number; total: number } => {
  const aired = Object.values(season.episodes).filter((e) => episodeAiringInfo(e, seriesStatus).aired);
  return { watched: aired.filter((e) => e.watched).length, total: aired.length };
};

const SeriesDetail = ({ series, uid, onClose, onToggleEpisode, onToggleSeason }: SeriesDetailProps) => {
  const [detail, setDetail] = useState<MovieDetailData | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [providers, setProviders] = useState<WatchProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setDetailError(null);

    fetchMovieDetail(series.id, "tv")
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        console.error("Erro ao buscar detalhes da série:", err);
        if (!cancelled) setDetailError("Não foi possível carregar os detalhes agora.");
      });

    setProviders(null);
    setProvidersLoading(true);
    fetchCurrentLocation()
      .then(({ countryCode }) => fetchWatchProviders(series.id, "tv", countryCode ?? DEFAULT_COUNTRY_CODE))
      .then((data) => {
        if (!cancelled) setProviders(data);
      })
      .catch((err) => console.error("Erro ao buscar onde assistir:", err))
      .finally(() => {
        if (!cancelled) setProvidersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [series.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const seasonNumbers = sortedNumberKeys(series.seasons);
  // Abre com a primeira temporada ainda não 100% vista (ou a primeira de
  // todas, se já viu tudo) — poupa um clique de quem tá acompanhando em
  // dia, sem esconder o resto (continua tudo colapsável/expansível).
  const firstUnfinished =
    seasonNumbers.find((n) => {
      const { watched, total } = seasonProgress(series.seasons[String(n)]);
      return total > 0 && watched < total;
    }) ?? seasonNumbers[0];
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set(firstUnfinished !== undefined ? [firstUnfinished] : []));

  const toggleSeasonExpanded = (seasonNumber: number) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) next.delete(seasonNumber);
      else next.add(seasonNumber);
      return next;
    });
  };

  // Marca/desmarca a temporada inteira de uma vez, sem precisar expandir
  // — só considera episódio já lançado (não dá pra marcar como visto
  // algo que ainda não foi ao ar). Se já estava tudo visto, desmarca
  // tudo; senão marca o que falta. Um `onToggleSeason` SÓ (não um loop de
  // onToggleEpisode) — loop já causou bug real (ver comentário em
  // service/FollowingSettings.ts, setSeasonWatched).
  const toggleWholeSeason = (seasonNumber: number, season: FollowedSeason) => {
    const airedNumbers = sortedNumberKeys(season.episodes).filter((ep) => episodeAiringInfo(season.episodes[String(ep)], series.status).aired);
    if (airedNumbers.length === 0) return;
    const allWatched = airedNumbers.every((ep) => season.episodes[String(ep)].watched);
    onToggleSeason(series, seasonNumber, airedNumbers, !allWatched);
  };

  const { watched: watchedCount, total: totalEpisodes } = followedSeriesProgress(series);
  const pct = progressPercent(watchedCount, totalEpisodes);

  return (
    <div className="movie-detail__overlay" onClick={onClose}>
      <div className="movie-detail__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="movie-detail__close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        {!detail && !detailError && (
          <p className="movie-detail__loading">
            <Loader2 className="movie-detail__spinner" size={20} />
            Carregando detalhes...
          </p>
        )}

        {detailError && <p className="movie-detail__error">{detailError}</p>}

        {detail && (
          <>
            <MovieDetailHeader detail={detail} />

            <div className="series-page__episodes-section">
              <div className="series-page__episodes-header">
                <h3 className="series-page__episodes-title">Episódios</h3>
                <span className="series-page__detail-progress">
                  visto: {watchedCount}/{totalEpisodes} ({pct}%)
                </span>
              </div>
              <div className="series-page__progress-bar">
                <div className="series-page__progress-fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="series-page__season-accordion">
                {seasonNumbers.map((seasonNumber) => {
                  const season = series.seasons[String(seasonNumber)];
                  const { watched, total } = seasonProgress(season);
                  const seasonPct = progressPercent(watched, total);
                  const isExpanded = expandedSeasons.has(seasonNumber);
                  const episodeNumbers = sortedNumberKeys(season.episodes);
                  const allAired = episodeNumbers.every((ep) => episodeAiringInfo(season.episodes[String(ep)], series.status).aired);
                  const airedProgress = seasonAiredProgress(season, series.status);
                  const seasonFullyMarked = airedProgress.total > 0 && airedProgress.watched === airedProgress.total;

                  return (
                    <div key={seasonNumber} className="series-page__season">
                      <div className="series-page__season-header">
                        <button
                          type="button"
                          className="series-page__season-toggle"
                          onClick={() => toggleSeasonExpanded(seasonNumber)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span className="series-page__season-name">{season.name || `Temporada ${seasonNumber}`}</span>
                        </button>

                        <span className="series-page__season-count">
                          {watched}/{total}
                        </span>

                        <button
                          type="button"
                          className={
                            seasonFullyMarked
                              ? "series-page__season-mark-all series-page__season-mark-all--active"
                              : "series-page__season-mark-all"
                          }
                          onClick={() => toggleWholeSeason(seasonNumber, season)}
                          disabled={!uid || airedProgress.total === 0}
                          title={seasonFullyMarked ? "Desmarcar temporada inteira" : "Marcar temporada inteira como vista"}
                          aria-label={seasonFullyMarked ? "Desmarcar temporada inteira" : "Marcar temporada inteira como vista"}
                        >
                          <Check size={14} />
                        </button>
                      </div>

                      <div className="series-page__season-progress-bar">
                        <div className="series-page__season-progress-fill" style={{ width: `${seasonPct}%` }} />
                      </div>

                      {isExpanded && (
                        <div className="series-page__episode-list">
                          {episodeNumbers.map((ep) => {
                            const episode = season.episodes[String(ep)];
                            const airing = episodeAiringInfo(episode, series.status);

                            if (!airing.aired) {
                              return (
                                <div key={ep} className="series-page__episode series-page__episode--unaired">
                                  <span className="series-page__episode-check" />
                                  <span className="series-page__episode-number">{ep}.</span>
                                  <span className="series-page__episode-name">{episode.name}</span>
                                  <span className="series-page__episode-airing">{airing.label}</span>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={ep}
                                type="button"
                                className={episode.watched ? "series-page__episode series-page__episode--watched" : "series-page__episode"}
                                onClick={() => onToggleEpisode(series, seasonNumber, ep)}
                                disabled={!uid}
                              >
                                <span className="series-page__episode-check">{episode.watched && <Check size={14} />}</span>
                                <span className="series-page__episode-number">{ep}.</span>
                                <span className="series-page__episode-name">{episode.name}</span>
                              </button>
                            );
                          })}
                          {!allAired && <p className="series-page__season-hint">Episódios sem marcação ainda não foram ao ar.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <MovieDetailCast cast={detail.cast} />
            <MovieDetailProviders providersLoading={providersLoading} providers={providers} />
          </>
        )}
      </div>
    </div>
  );
};

export default SeriesDetail;
