# actions/helpers/addtotimeline

**Página/ciclo:** `helpers` → `addtotimeline`

Ciclo "adicionar a uma timeline existente": listar as timelines do usuário -> escolher uma -> gravar (ignora se o título já estava nela). usado no modal "adicionar a uma timeline existente" (botão + dos cards de sugestão).

## Funções (na ordem em que o ciclo acontece)
- `useAddToExisting` — Ciclo "adicionar a uma timeline existente": listar as timelines do usuário -> escolher uma -> gravar (ignora se o título já estava nela). usado no modal "adicionar a uma timeline existente" (botão + dos cards de sugestão).
- `useCreateManually` — Ciclo "criar timeline manualmente": nome -> buscar e escolher títulos -> salvar (a timeline nasce seguida). usado no modal "criar nova timeline" (botão + dos cards de sugestão).

## Tipos
- `AddableMovie`
