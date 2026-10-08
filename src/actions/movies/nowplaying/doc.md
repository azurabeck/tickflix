# actions/movies/nowplaying

**Página/ciclo:** `movies` → `nowplaying`

Section "Em cartaz": pega a fatia "nowplaying" do dashboard (os filmes da cidade, com o loading dela) e monta o título (com a cidade). usado em: página Filmes

## Funções (na ordem em que o ciclo acontece)
- `useNowPlaying` — Section "Em cartaz": pega a fatia "nowplaying" do dashboard (os filmes da cidade, com o loading dela) e monta o título (com a cidade). usado em: página Filmes
- `openOnIngresso` — Clicar no card aberto leva à página do filme no ingresso.com (usa o link do backend; sem ele, monta pelo título). usado em: página Filmes
