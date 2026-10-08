# actions/helpers/followed

**Página/ciclo:** `helpers` → `followed`

Ciclo de "estou assistindo": seguir/deixar de seguir séries e animes, marcar episódios/temporadas e calcular progresso e se já foi ao ar (Firestore).

## Funções (na ordem em que o ciclo acontece)
- `fetchSeasonEpisodes` — Episódios de uma temporada, direto do TMDb. usado em: helpers/seriesdetail
- `fetchSeriesWithEpisodes` — Busca todas as temporadas e episódios (nenhum visto ainda) e diz se é anime (mesma definição do resto do app: gênero Animação + produzido/falado em japonês). usado em: MediaCardsProvider
- `fetchFollowedSeries` — Lê no Firestore as séries/animes que o usuário segue (as mais recentes primeiro). usado em: MediaCardsProvider
- `followSeries` — Começa a seguir uma série/anime (ignora se já seguia). usado em: MediaCardsProvider
- `completeFollowed` — Completa em segundo plano as séries seguidas que precisam (antigas, ou "indisponíveis" há mais de uma semana): consulta rápida no TMDb e já grava no Firebase. As mais recentes primeiro. usado em: MediaCardsProvider
- `unfollowSeries` — Deixa de seguir e apaga o progresso. usado em: MediaCardsProvider
- `setEpisodesWatched` — Um episódio, uma temporada inteira ou vários episódios de temporadas diferentes: tudo é uma lista de episódios. usado em: MediaCardsProvider
- `followedSeriesProgress` — Episódios vistos e total de uma série seguida. usado em: MediaCard, SeriesDetail, MediaCardsProvider
- `episodeAiringInfo` — Diz se o episódio já foi ao ar e, se não, o texto de estreia. usado em: helpers/progress, helpers/seriesdetail, SeasonItem
- `unwatchedBefore` — Episódios já exibidos e ainda não vistos antes de (season, beforeEpisode): base do "marcar os anteriores também?". usado em: MediaCardsProvider
- `withEpisodes` — Cópia imutável da série com os episódios informados marcados como vistos/não vistos (atualização otimista da tela). usado em: MediaCardsProvider

## Tipos
- `FollowedEpisode`
- `FollowedSeason`
- `FollowedCategory`
- `FollowedSeries`
- `EpisodeRef`
- `EpisodeAiringInfo`
