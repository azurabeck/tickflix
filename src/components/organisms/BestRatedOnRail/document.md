# BestRatedOnRail (organismo)

Fileira "Melhor avaliadas no <streaming>": cada streaming pede os próprios dados.

## Props
- `dashboard`: `PageDashboard`
- `provider`: `{ id: number; label: string }`
- `titleKey`: `string; // chave de tradução do título ("Melhor avaliadas no {{provider}}")`
- `useBestRatedOn`: `(dashboard: PageDashboard, providerId: number) => Section<MediaItem>; // a função da section da página (Séries ou Animes)`

## Depende de
`components/organisms/SeriesRailSection`, `actions/helpers/section`

## Estilo
Sem estilo próprio: usa as classes dos componentes que compõe.
