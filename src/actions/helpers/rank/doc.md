# actions/helpers/rank

**Página/ciclo:** `helpers` → `rank`

Section Rank: dois rankings lado a lado. "Popularidade": a lista que veio do backend (dashboard da página), já com "disponível". "Seu Rank de Notas": as notas que o usuário já deu (o MediaCardsProvider guarda título e imagens junto), da maior para a menor. usado em: RankSection

## Funções (na ordem em que o ciclo acontece)
- `topRatedKeys` — Chaves (`movie-1`, `tv-2`) mais bem avaliadas pelo usuário, só do tipo da página; empate fica com o mais recente. usado na section "Seu Rank de Notas" e na base de gosto da "Sugestão da IA".
- `useRank` — Section Rank: dois rankings lado a lado. "Popularidade": a lista que veio do backend (dashboard da página), já com "disponível". "Seu Rank de Notas": as notas que o usuário já deu (o MediaCardsProvider guarda título e imagens junto), da maior para a menor. usado em: RankSection
