# actions/helpers/moviedetail

**Página/ciclo:** `helpers` → `moviedetail`

Ciclo "abrir o detalhe de um título": busca o detalhe e, em paralelo, onde assistir (no país do usuário; sem localização, Brasil). usado no modal de detalhe do filme/série (aberto pelos cards de qualquer página).

## Funções (na ordem em que o ciclo acontece)
- `formatRuntime` — "2h28min". usado no cabeçalho do detalhe do título.
- `fetchAvailabilityMap` — Disponível = dá para assistir (assinatura ou aluguel) no Brasil ou nos EUA. Tenta de novo uma vez se a chamada falhar. usado no selo "disponível" dos cards de qualquer página (MediaCardsProvider).
- `useMovieDetail` — Ciclo "abrir o detalhe de um título": busca o detalhe e, em paralelo, onde assistir (no país do usuário; sem localização, Brasil). usado no modal de detalhe do filme/série (aberto pelos cards de qualquer página).

## Tipos
- `MovieDetail`
- `WatchProvider`
- `WatchProviders`
