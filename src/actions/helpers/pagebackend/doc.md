# actions/helpers/pagebackend

**Página/ciclo:** `helpers` → `pagebackend`

Dashboard, parte backend. O ciclo de cada página: 1. confere o cache de cada grupo; 2. confere se pediram para atualizar; 3. confere a cidade; 4. pede ao backend o que faltou (um pedido por grupo). Devolve `section(nome)`: a fatia de uma section, com o loading do grupo dela. usado em: helpers/section, presentation/cyclerender

## Funções (na ordem em que o ciclo acontece)
- `slugify` — "São Paulo" -> "sao-paulo": o formato que o ingresso.com usa nas URLs. usado em: movies/nowplaying
- `usePageBackend` — Dashboard, parte backend. O ciclo de cada página: 1. confere o cache de cada grupo; 2. confere se pediram para atualizar; 3. confere a cidade; 4. pede ao backend o que faltou (um pedido por grupo). Devolve `section(nome)`: a fatia de uma section, com o loading do grupo dela. usado em: helpers/section, presentation/cyclerender

## Tipos
- `Section`
- `BackendOptions`
