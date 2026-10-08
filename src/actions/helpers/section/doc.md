# actions/helpers/section

**Página/ciclo:** `helpers` → `section`

Dashboard de uma página: junta as duas funções universais que entregam a resposta por section. Backend  (usePageBackend):  cache -> atualizar? -> cidade -> pedido ao backend (um por grupo). Firebase (usePageFirebase): timelines seguidas e o que o MediaCardsProvider já leu (vistos, notas e seguidos). As sections só pegam a sua fatia: dashboard.section("nome") e dashboard.firebase. usado em: animes/dashboard, helpers/pagebackend, helpers/pagefirebase, movies/dashboard, series/dashboard

## Funções (na ordem em que o ciclo acontece)
- `usePageDashboard` — Dashboard de uma página: junta as duas funções universais que entregam a resposta por section. Backend  (usePageBackend):  cache -> atualizar? -> cidade -> pedido ao backend (um por grupo). Firebase (usePageFirebase): timelines seguidas e o que o MediaCardsProvider já leu (vistos, notas e seguidos). As sections só pegam a sua fatia: dashboard.section("nome") e dashboard.firebase. usado em: animes/dashboard, helpers/pagebackend, helpers/pagefirebase, movies/dashboard, series/dashboard

## Tipos
- `PageDashboard`
