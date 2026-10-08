# actions/helpers/timelineai

**Página/ciclo:** `helpers` → `timelineai`

Ciclo "criar timeline por texto": a IA entende o pedido, o catálogo do TMDb resolve os títulos e a conversa refina o rascunho.

## Funções (na ordem em que o ciclo acontece)
- `respondToTimelineChat` — Responde uma mensagem do chat de ajuste da timeline e diz se ela pede mudança na lista. usado em: helpers/createtimeline
- `resolveTimelineMovies` — Transforma uma descrição em texto livre numa lista de títulos reais (IA + TMDb). usado em: franchises/dashboard, helpers/createtimeline

## Tipos
- `ResolvedTimelineDraft`
