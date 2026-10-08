# actions/helpers/section

**Página/ciclo:** `helpers` → `section`

Dashboard de uma página: duas funções universais que entregam a resposta por section. Backend:  confere o cache da página -> confere se precisa atualizar -> confere a cidade -> pede ao backend o que falta (um pedido por grupo). Firebase: lê o que é da página (timelines seguidas) e junta o que o MediaCardsProvider já lê (vistos e seguidos). As sections só pegam a sua fatia: dashboard.section("nome") e dashboard.firebase. usado em: animes/dashboard, movies/dashboard, series/dashboard

## Funções (na ordem em que o ciclo acontece)
- `slugify` — "São Paulo" -> "sao-paulo": o formato que o ingresso.com usa nas URLs. usado em: movies/nowplaying
- `usePageDashboard` — Dashboard de uma página: duas funções universais que entregam a resposta por section. Backend:  confere o cache da página -> confere se precisa atualizar -> confere a cidade -> pede ao backend o que falta (um pedido por grupo). Firebase: lê o que é da página (timelines seguidas) e junta o que o MediaCardsProvider já lê (vistos e seguidos). As sections só pegam a sua fatia: dashboard.section("nome") e dashboard.firebase. usado em: animes/dashboard, movies/dashboard, series/dashboard

## Tipos
- `Section`
- `PageDashboard`
