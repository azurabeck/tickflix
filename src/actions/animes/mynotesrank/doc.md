# actions/animes/mynotesrank

**Página/ciclo:** `animes` → `mynotesrank`

Section "Seu Rank de Notas" (Firebase): as notas já vêm do Firestore (MediaCardsProvider). Só entra o que é anime: cada título guarda a sua categoria (a do card quando foi avaliado ou seguido; os registros antigos são completados sozinhos no TMDb). Devolve também o que o usuário segue nesta página, que é a base de gosto da "Sugestão da IA" quando ainda não há notas. usado em: página Animes

## Funções (na ordem em que o ciclo acontece)
- `useAnimesMyNotesRank` — Section "Seu Rank de Notas" (Firebase): as notas já vêm do Firestore (MediaCardsProvider). Só entra o que é anime: cada título guarda a sua categoria (a do card quando foi avaliado ou seguido; os registros antigos são completados sozinhos no TMDb). Devolve também o que o usuário segue nesta página, que é a base de gosto da "Sugestão da IA" quando ainda não há notas. usado em: página Animes
