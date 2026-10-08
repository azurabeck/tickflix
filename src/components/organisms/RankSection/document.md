# RankSection (organismo)

Linha com três blocos: ranking popular, "Seu Rank de Notas" e a sugestão da IA.

## Props
- `mediaKind?`: `SuggestionKind`
- `category?`: `"series" | "animes"`
- `keyFilter?`: `(key: string) => boolean`
- `popularityTitle`: `ReactNode`
- `popularity`: `DashboardMovie[] | null`
- `popularityLoading?`: `boolean`
- `popularityError`: `string | null`
- `recentKeys`: `string[]`

## Depende de
`components/atoms/HomeRow`, `components/atoms/HomeSection`, `components/organisms/AiSuggestionsPanel`, `components/molecules/RankComponent`, `actions/helpers/rank`, `actions/helpers/aisuggestion`

## Estilo
Sem estilo próprio: usa as classes dos componentes que compõe.
