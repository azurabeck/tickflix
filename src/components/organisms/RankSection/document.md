# RankSection (organismo)

Linha com três blocos: ranking popular (backend), "Seu Rank de Notas" (Firebase) e a sugestão da IA. Só mostra o que as sections entregam.

## Props
- `mediaKind?`: `SuggestionKind`
- `category?`: `"series" | "animes"`
- `popularityTitle`: `ReactNode`
- `popularity`: `Section<RankItem>`
- `myNotes`: `MyNotes`

## Depende de
`components/atoms/HomeRow`, `components/atoms/HomeSection`, `components/organisms/AiSuggestionsPanel`, `components/molecules/RankComponent`, `actions/helpers/rank`, `actions/helpers/section`, `actions/helpers/aisuggestion`

## Estilo
Sem estilo próprio: usa as classes dos componentes que compõe.
