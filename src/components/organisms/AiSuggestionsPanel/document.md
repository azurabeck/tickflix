# AiSuggestionsPanel (organismo)

Painel roxo "Sugestão da IA": 3 sugestões por dia; o que você assiste vira um botão de refresh.

## Props
- `mediaKind`: `SuggestionKind`
- `category?`: `"series" | "animes"`

## Depende de
`components/atoms/HomeSection`, `components/molecules/SuggestionCard`, `components/atoms/SuggestionRefreshCard`, `actions/helpers/aisuggestion`, `actions/helpers/timelines`

## Estilo
`style.scss` — classes `ai-suggestions-panel` e `ai-suggestions-panel__*` (BEM).
