# actions/timelines/mytimelines

**Página/ciclo:** `timelines` → `mytimelines`

Ciclo "minhas timelines": carregar, seguir/deixar de seguir (otimista) e apagar (com confirmação). usado em: página Timelines

## Funções (na ordem em que o ciclo acontece)
- `parseCategory` — Aba da página Timelines a partir do `?category=` da URL. usado em: página Timelines
- `timelinesOfCategory` — Quais timelines aparecem em cada aba da página. usado em: página Timelines
- `useMyTimelines` — Ciclo "minhas timelines": carregar, seguir/deixar de seguir (otimista) e apagar (com confirmação). usado em: página Timelines
