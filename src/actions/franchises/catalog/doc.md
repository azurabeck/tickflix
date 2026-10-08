# actions/franchises/catalog

**Página/ciclo:** `franchises` → `catalog`

Franquias disponíveis (Marvel, DC, Star Wars...) e o catálogo global de cada uma no Firestore.

## Funções (na ordem em que o ciclo acontece)
- `FRANCHISE_CONFIGS` — Franquias disponíveis (nome, coleção no Firestore e a busca usada para montar a lista).
- `findFranchiseConfig` — Acha a franquia pelo slug da URL. usado em: página Franquias
- `fetchFranchiseCatalog` — Lê no Firestore a lista de títulos da franquia, compartilhada entre todos os usuários. usado em: franchises/dashboard
- `saveFranchiseCatalog` — Grava a lista da franquia (quem abre primeiro monta; os outros reaproveitam). usado em: franchises/dashboard

## Tipos
- `FranchiseConfig`
