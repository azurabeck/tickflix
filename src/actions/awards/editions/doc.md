# actions/awards/editions

**Página/ciclo:** `awards` → `editions`

Configuração das premiações (Oscar, Globo de Ouro, Cannes), geração da lista de edições e leitura/gravação dos indicados no Firestore.

## Funções (na ordem em que o ciclo acontece)
- `OSCAR_CONFIG` — Configuração do Oscar (anos, nome da edição, cor e coleção no Firestore). usado em: App
- `GOLDEN_GLOBES_CONFIG` — Configuração do Globo de Ouro (anos, nome da edição, cor e coleção no Firestore). usado em: App
- `CANNES_CONFIG` — Configuração do Festival de Cannes (anos, nome da edição, cor e coleção no Firestore). usado em: App
- `AWARD_CONFIGS` — Todas as premiações disponíveis. usado em: helpers/nav
- `getAwardEditions` — Lista as edições de uma premiação, da mais recente para a mais antiga, ainda sem indicados. usado em: awards/dashboard
- `fetchAwardEditionFromFirestore` — Lê no Firestore os indicados já salvos de uma edição. usado em: awards/dashboard
- `fetchAllSavedAwardEditions` — Lê de uma vez todas as edições já resolvidas de uma premiação (a grade mostra o vencedor de cada uma). usado em: awards/dashboard
- `awardNomineeKey` — Chave do indicado (`movie-<id>`; sem id, pelo título) para saber se já foi visto. usado em: EditionDetail
- `parseAwardCategoriesJson` — Valida e converte o JSON colado pelo usuário em categorias e indicados. usado em: awards/adddata
- `saveAwardEditionData` — Grava os indicados da edição no Firestore e devolve a manchete (o vencedor de Melhor Filme). usado em: awards/adddata

## Tipos
- `AwardConfig`
- `AwardNominee`
- `AwardCategory`
- `AwardEdition`
