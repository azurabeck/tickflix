# MediaCard — card global de filme / série / anime

Figma da Rebecca ("componente global de card de filme 2 types"). **Todo lugar
do app que mostra um título como card usa este componente.**

| type    | usado em          | linha do painel roxo                                   | check                | nota                 |
| ------- | ----------------- | ------------------------------------------------------ | -------------------- | -------------------- |
| `movie` | filmes            | `[nota]` … `[📺 streaming] [▷ trailer] [✓]`            | "assisti"            | só depois de assistir |
| `serie` | séries **e** animes | `[barra 10/300]` `[nota]` `[▷ trailer] [✓]` (3 colunas) | "estou assistindo" (segue → Minhas séries / Meus animes) | a qualquer momento |

## Peças

- `MediaCard.tsx` — só desenha (props: `type`, `item`, `isChecked`, `progress`…).
- `ConnectedMediaCard.tsx` — o que as páginas usam: descobre o `type` pelo
  `item.mediaType` (`tv` → `serie`), liga ao estado global e busca o backdrop
  no TMDb quando o item só tem o pôster.
- `MediaCardsProvider.tsx` — estado/ações globais (montado em `PrivateLayout`):
  filmes vistos + notas, séries/animes seguidos, disponibilidade, check, nota,
  trailer, detalhe, episódios. Renderiza os modais (trailer, `MovieDetail`,
  `SeriesDetail`). `checkedMap` = filme visto + série/anime seguido (progresso
  de timeline, ranks, IA).
- `useOpenCard.ts` — "um card aberto por vez" em cada fileira/grade.
- `styles.scss` — medidas do Figma; `.media-grid` é a grade de cards.

## Como usar

```tsx
const open = useOpenCard(items);
items.map((item, i) => {
  const id = cardKey(item, i);
  return <ConnectedMediaCard key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
});
```

Páginas que listam itens chamam `useMediaCards().loadAvailability(items)` para
o ícone de streaming do `movie`. `item.category` (`"series"` | `"animes"`)
define em qual lista o check segue a série (página Animes passa `"animes"`).

## Onde está aplicado

Home (fileiras, modais "ver todos"/lançamentos), Séries, Animes, busca,
timelines (modal), franquias e premiações (Oscar/Globo/Cannes). Ranks usam o
mesmo `type` por linha (`RankComponent`). A "Sugestão da IA" ainda tem pôsteres
próprios (design à parte).
