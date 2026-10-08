# actions/helpers/carddata

**Página/ciclo:** `helpers` → `carddata`

Consulta rápida no TMDb dos registros que precisam: completa os dados do card e confere de novo o "disponível". Cuida de no máximo 40 por abertura do site (do mais prioritário, na ordem recebida) para não pesar. Devolve os campos novos de cada um, para quem chamou gravar no Firebase. usado em: helpers/followed, helpers/watched

## Funções (na ordem em que o ciclo acontece)
- `resolveCardData` — Consulta rápida no TMDb dos registros que precisam: completa os dados do card e confere de novo o "disponível". Cuida de no máximo 40 por abertura do site (do mais prioritário, na ordem recebida) para não pesar. Devolve os campos novos de cada um, para quem chamou gravar no Firebase. usado em: helpers/followed, helpers/watched

## Tipos
- `CardData`
