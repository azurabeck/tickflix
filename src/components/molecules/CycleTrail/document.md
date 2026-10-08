# CycleTrail (molécula)

Trilha de um ciclo: uma linha com as etapas principais, na ordem em que acontecem. Ao escolher uma etapa que faz várias coisas, abre-se logo abaixo uma linha com o que tem dentro dela (e assim por diante). A etapa escolhida fica roxa, o caminho até ela fica com borda roxa e as etapas que já passaram ficam claras.

## Props
- `rows`: `TrailRow[]`
- `onSelect`: `(path: string[]) => void`

## Depende de
`actions/presentation/cycles`

## Estilo
`style.scss` — classes `cycle-trail` e `cycle-trail__*` (BEM).
