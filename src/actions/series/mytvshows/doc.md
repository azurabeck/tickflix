# actions/series/mytvshows

**Página/ciclo:** `series` → `mytvshows`

Section "Minhas séries" (Firebase): inicia o loading -> a lista vem do Firestore (MediaCardsProvider) -> fecha o loading. Cada título seguido já guarda o que o card precisa (imagens, ano, "disponível"), então não consulta o TMDb. usado em: página Séries

## Funções (na ordem em que o ciclo acontece)
- `useMyTvShows` — Section "Minhas séries" (Firebase): inicia o loading -> a lista vem do Firestore (MediaCardsProvider) -> fecha o loading. Cada título seguido já guarda o que o card precisa (imagens, ano, "disponível"), então não consulta o TMDb. usado em: página Séries
