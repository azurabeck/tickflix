# actions/helpers/seriesdetail

**Página/ciclo:** `helpers` → `seriesdetail`

Ciclo "ver a descrição do episódio": abre/fecha o texto e busca na primeira vez. usado em: EpisodeRow

## Funções (na ordem em que o ciclo acontece)
- `sortedNumberKeys` — Temporadas/episódios vêm como chave string (mapa do Firestore): ordena numericamente. usado em: SeasonItem, SeriesDetail
- `seasonProgress` — Episódios vistos e total de uma temporada. usado em: SeasonItem
- `seasonAiredProgress` — Só os episódios já lançados contam pro "tá tudo marcado?" do botão de temporada inteira. usado em: SeasonItem
- `firstUnfinishedSeason` — A primeira temporada com episódios por ver (ou a primeira) começa aberta. usado em: SeriesDetail
- `airedEpisodesOf` — Os episódios já lançados de uma temporada e se todos estão vistos (pro "marcar temporada inteira"). usado em: SeriesDetail
- `useEpisodeOverview` — Ciclo "ver a descrição do episódio": abre/fecha o texto e busca na primeira vez. usado em: EpisodeRow
