# actions/helpers/watched

**Página/ciclo:** `helpers` → `watched`

Ciclo do "já vi": ler, marcar e desmarcar filmes/séries vistos, notas e os últimos vistos (Firestore).

## Funções (na ordem em que o ciclo acontece)
- `MIN_RATING` — Menor nota possível. usado em: RatingInput
- `MAX_RATING` — Maior nota possível. usado em: RatingInput
- `RATING_STEP` — De quanto em quanto a nota varia. usado em: RatingInput
- `fetchWatched` — Lê no Firestore tudo que o usuário já viu ou avaliou. usado em: profile/statistics, MediaCardsProvider
- `saveWatched` — Marca ou desmarca como visto, gravando junto os dados do card. usado em: MediaCardsProvider
- `saveRating` — Grava a nota (cria o registro se ainda não existir, como nas séries); sem nota e sem "visto", apaga o registro. usado em: MediaCardsProvider
- `completeWatched` — Completa em segundo plano os registros que precisam (antigos, ou "indisponíveis" há mais de uma semana): consulta rápida no TMDb e já grava no Firebase, para não precisar consultar de novo. Os mais recentes primeiro. usado em: MediaCardsProvider

## Tipos
- `WatchedTitle`
