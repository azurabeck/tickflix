# SearchModal

Modal GLOBAL de busca, aberto pelo ícone de lupa da navbar
(`@/components/appNav`) — pedido explícito da Rebecca: "essa barra de
search que a gente tem no final das páginas filmes/séries/animes pode
sair dali e virar só um ícone de lupa no navbar, quando o usuário clica,
então aparece o modal pra ele fazer a busca".

## Consolidação — 3 rodapés viraram 1 modal

Antes existiam TRÊS buscas quase idênticas, cada uma no rodapé de uma
página: `searchMovies` (Home/Filmes, `/search/multi` do TMDb — filme E
série juntos), `searchSeries` (Séries, `/search/tv`) e `searchAnime`
(Animes, também `/search/tv`, com o comentário explícito "Igual
searchSeries — NÃO filtra por anime, mesma decisão da página Séries").
Ou seja: as duas últimas eram, na prática, o MESMO `/search/tv` sem
filtro nenhum a mais — a única diferença real de `searchMovies` era
incluir filme também. Consolidar numa busca só (`searchMovies`,
reaproveitada direto de `@/pages/private/home/dashboard/functions`, sem
duplicar) não perde nenhum comportamento de verdade — só GANHA: buscar
de dentro de Séries/Animes agora também acha filme, o que antes não
existia. `searchSeries`/`searchAnime` foram deletadas (código morto
depois da consolidação).

## O que ficou de fora — "seguir" rápido do resultado de busca

As buscas de Séries/Animes tinham um botão extra em cada resultado:
adicionar direto a "Minhas séries"/"Meus animes" sem abrir nada.
Deliberadamente NÃO entrou aqui — essa ação (`handleToggleFollowed` em
cada página) resolve temporadas + TODOS os episódios no TMDb
(`fetchSeriesWithEpisodes`) antes de gravar com uma `category`
("series"/"animes") que só faz sentido presa a UMA página; um modal
global que também abre a partir da página Filmes não tem como saber
qual categoria usar, e mesmo se soubesse, seria estranho: buscar em
Filmes e ver um botão de "seguir" pensado pra série. Clicar num
resultado de série/anime aqui abre o `MovieDetail` genérico (sinopse/
elenco/onde assistir) — pra seguir de verdade, a Rebecca ainda usa as
fileiras de streaming ou "Minhas séries"/"Meus animes" da página certa,
que continuam com o botão de sempre.

## Estado próprio — componente GLOBAL, não pertence a nenhuma página

Como é renderizado por `@/components/appNav` (fora de qualquer página
específica), gerencia o próprio `watchedMap` (`fetchWatchedMap`/
`setWatched`, `service/WatchedSettings.ts`) em vez de receber isso via
props — mesmo padrão que Timelines/Awards/Franchise já usam de forma
independente, cada tela carregando seu próprio estado de "já vi".
`selectedMovie` local abre o `MovieDetail` global aninhado (mesmo
cuidado de sempre com `stopPropagation` num wrapper, pra fechar o
`MovieDetail` não borbulhar e fechar o `SearchModal` junto).

## Visual

Mesmo padrão de overlay/painel claro de `@/components/movieDetail`
(fundo escurecido, painel branco, botão de fechar no canto) — só
ancorado mais pro TOPO da tela (`align-items: flex-start` no overlay,
não centralizado verticalmente) em vez de crescer pro centro, pra não
competir com o teclado virtual em mobile e deixar a grade de resultados
esticar pra baixo com espaço de sobra.
