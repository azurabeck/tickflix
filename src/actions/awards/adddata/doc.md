# actions/awards/adddata

**Página/ciclo:** `awards` → `adddata`

Exemplo do JSON que o usuário cola no "Adicionar dados" (modelo de formato e placeholder). usado em: AddDataModal

## Funções (na ordem em que o ciclo acontece)
- `buildExampleJson` — Exemplo do JSON que o usuário cola no "Adicionar dados" (modelo de formato e placeholder). usado em: AddDataModal
- `buildResearchPrompt` — Prompt que o usuário copia e cola numa IA para ela devolver os indicados da edição já em JSON. usado em: AddDataModal
- `saveEditionFromJson` — Ciclo "adicionar dados de uma edição": valida o JSON colado e grava no Firestore. usado em: AddDataModal
