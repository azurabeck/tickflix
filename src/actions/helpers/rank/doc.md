# actions/helpers/rank

**Página/ciclo:** `helpers` → `rank`

Devolve a função que transforma um card em item de rank, com a nota do usuário e se ele já viu/segue. usado em: animes/mostwatchedrank, movies/popularityrank, presentation/cyclenotes, series/mostwatchedrank

## Funções (na ordem em que o ciclo acontece)
- `useToRankItem` — Devolve a função que transforma um card em item de rank, com a nota do usuário e se ele já viu/segue. usado em: animes/mostwatchedrank, movies/popularityrank, presentation/cyclenotes, series/mostwatchedrank
- `toPopularityItems` — Section "Popularidade" / "Mais vistas" (Rank): a fatia do dashboard (backend) vira itens de rank, com a nota do usuário em cada card. usado em: animes/mostwatchedrank, movies/popularityrank, series/mostwatchedrank
- `useMyNotes` — Section "Seu Rank de Notas" (Firebase): as notas que o usuário já deu (o MediaCardsProvider guarda título e imagens junto), da maior para a menor. Só entra o que é do tipo da página; em séries e animes, a categoria que o título guarda. usado em: helpers/pagefirebase, presentation/cyclenotes
- `useRankHandlers` — As ações dos cards dos ranks (abrir, marcar como visto, avaliar): as mesmas nos dois blocos. usado em: presentation/cyclenotes, RankSection

## Tipos
- `MyNotes`
