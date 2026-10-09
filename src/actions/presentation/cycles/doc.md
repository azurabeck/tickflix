# actions/presentation/cycles

**Página/ciclo:** `presentation` → `cycles`

Estado de um ciclo na tela: o caminho da etapa escolhida (ex.: ["dashboard", "backend", "request"]), a trilha, o trecho dela e o anterior/próximo. usado em: PresentationCycle

## Funções (na ordem em que o ciclo acontece)
- `CYCLE_IDS` — Os ciclos do menu "Ciclo de Funções", na ordem em que aparecem. Quem ainda não tem conteúdo fica fora de CYCLES. usado em: presentation/tabs
- `PROBLEM_IDS` — Os itens do menu "Problemas & Soluções", na ordem em que aparecem. usado em: presentation/tabs
- `getCycle` — O ciclo pronto de um item do menu (undefined se ainda não foi montado). usado em: private/presentation
- `useCycleView` — Estado de um ciclo na tela: o caminho da etapa escolhida (ex.: ["dashboard", "backend", "request"]), a trilha, o trecho dela e o anterior/próximo. usado em: PresentationCycle

## Tipos
- `Cycle`
- `TrailRow`
