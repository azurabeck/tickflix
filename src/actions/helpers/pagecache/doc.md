# actions/helpers/pagecache

**Página/ciclo:** `helpers` → `pagecache`

Cache de páginas por usuário no navegador e pedido de atualização forçada.

## Funções (na ordem em que o ciclo acontece)
- `requestRefresh` — Avisa que os dados mudaram: cada página busca tudo de novo na próxima vez que abrir. usado em: helpers/usermenu
- `consumeRefreshRequest` — Pergunta (uma vez por página) se há um pedido de atualização pendente. usado em: helpers/pagebackend
- `getPageCache` — Lê o cache local de uma página do usuário (vale 7 dias). usado em: helpers/aisuggestion, helpers/pagebackend, presentation/problemcache
- `setPageCache` — Guarda o cache local de uma página do usuário. usado em: helpers/aisuggestion, helpers/pagebackend
- `clearPageCache` — Apaga todo o cache local do usuário. usado em: helpers/usermenu
