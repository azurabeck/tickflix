# actions/movies/recentlywatched

**Página/ciclo:** `movies` → `recentlywatched`

Últimos vistos (section do Firebase): inicia o loading -> a lista do usuário vem do Firestore (MediaCardsProvider) -> fecha o loading. Os filmes que o usuário marcou, do mais recente para o mais antigo. A lista (com título, imagens e "disponível" de cada filme) já veio do Firestore pelo MediaCardsProvider: aqui só ordena e corta. usado na section "Últimos vistos", no modal "ver todos" e como base de gosto da "Sugestão da IA".

## Funções (na ordem em que o ciclo acontece)
- `RAIL_LIMIT` — Quantos filmes aparecem na fileira Últimos vistos. usado em: página Filmes
- `MODAL_LIMIT` — Quantos filmes aparecem no modal "ver todos". usado em: RecentlyWatchedModal
- `useRecentlyWatched` — Últimos vistos (section do Firebase): inicia o loading -> a lista do usuário vem do Firestore (MediaCardsProvider) -> fecha o loading. Os filmes que o usuário marcou, do mais recente para o mais antigo. A lista (com título, imagens e "disponível" de cada filme) já veio do Firestore pelo MediaCardsProvider: aqui só ordena e corta. usado na section "Últimos vistos", no modal "ver todos" e como base de gosto da "Sugestão da IA".
