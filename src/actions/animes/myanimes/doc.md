# actions/animes/myanimes

**Página/ciclo:** `animes` → `myanimes`

Section "Meus animes" (Firebase): inicia o loading -> a lista vem do Firestore (MediaCardsProvider) -> fecha o loading. Cada título seguido já guarda o que o card precisa (imagens, ano, "disponível"), então não consulta o TMDb. usado em: página Animes

## Funções (na ordem em que o ciclo acontece)
- `useMyAnimes` — Section "Meus animes" (Firebase): inicia o loading -> a lista vem do Firestore (MediaCardsProvider) -> fecha o loading. Cada título seguido já guarda o que o card precisa (imagens, ano, "disponível"), então não consulta o TMDb. usado em: página Animes
