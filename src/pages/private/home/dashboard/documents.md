# Dashboard

Home de verdade (pós-login). Layout full-bleed: cada seção ocupa 100% da
largura da tela com a própria cor/gradiente de fundo; só o CONTEÚDO de
cada seção fica limitado por dentro (`.dashboard__inner`, teto de
`$content-max-width` = 1440px). A nav (logo + abas Home/Oscar/Timelines +
Sair) **não vive mais aqui** — é global, `@/components/appNav`, renderizada
uma vez por `@/pages/private/PrivateLayout.tsx` (`<Outlet/>`), nunca some
quando a página troca ou um dialog abre por cima. Ordem do conteúdo:

1. **Carrossel de trailers** (`HeroCarousel.tsx`) — trailer oficial
   (YouTube, mudo, autoplay) dos filmes EM CARTAZ, um de cada vez.
   Full-bleed de propósito (sem `.dashboard__inner`), com a legenda
   "TRAILER OFICIAL" + título por cima respeitando o mesmo recuo lateral
   do resto do conteúdo.

   **Fonte mudou** — pedido explícito da Rebecca: "os filmes que estamos
   exibindo são referente aos campeões de bilheteria... vamos mudar para
   mostrar os filmes em cartaz". Antes `fetchHeroTrailers` buscava os
   campeões de bilheteria (`fetchBoxOfficeChampions`) por conta própria;
   agora não busca lista nenhuma sozinho — recebe os filmes já
   resolvidos, os MESMOS da fileira "Em cartaz em {cidade}" logo abaixo
   (`loadHeroTrailers`, `index.tsx`, chamado dentro de `loadNowPlaying`
   assim que a lista de "em cartaz" resolve, seja pela real do
   ingresso.com ou pelo fallback TMDb) — garante que carrossel e fileira
   mostram exatamente os mesmos filmes, sem duas fontes "em cartaz"
   diferentes na mesma tela. `fetchHeroTrailers(movies)` só resolve o
   trailer de cada um via TMDb `/movie/{id}/videos` — só entra no
   carrossel quem tem um vídeo do YouTube cadastrado (nem todo filme
   tem) E tem `id` resolvido no TMDb (item do ingresso.com sem match não
   entra). Troca de trailer só quando o
   vídeo ATUAL termina de verdade — usa a IFrame API oficial do YouTube
   e escuta o evento `ENDED` (não um timer fixo, que cortava trailers
   mais longos no meio); `FALLBACK_MAX_MS` é só rede de segurança caso o
   evento nunca dispare. Dois botões só-ícone ao lado do selo "TRAILER
   OFICIAL": som (`mute`/`unMute` do player) e legenda (`loadModule`/
   `unloadModule` de `"captions"` — não é API oficialmente documentada
   do YouTube, mas funciona). O botão de legenda só aparece quando o
   trailer NÃO é dublado (`HeroTrailer.isDubbed`, calculado em
   `fetchHeroTrailers` checando se o nome do vídeo no TMDb contém
   "Dublado"/"Dublada") — áudio dublado não tem faixa de legenda de
   verdade, então o botão ficava visível sem fazer nada. Ambas as
   preferências (mudo/legenda) persistem entre trocas de trailer, já que
   cada troca recria o player do zero (reaplicadas no `onReady`).
2. **"Criar uma nova timeline"** (`CreateTimelinePanel.tsx`) — uma linha
   só: input (placeholder já com exemplo do que digitar) + botão do lado,
   direto abaixo do trailer. **Sem checkbox "Trazer tudo"/"Trazer os
   principais"** — isso é decidido lendo a própria descrição
   (`extractThemeFilters` já pede um campo `scope` pro Gemini preencher;
   se o usuário não pedir explicitamente "só os principais"/"os mais
   conhecidos" etc., o padrão é "tudo") e um campo `limit` separado
   quando o usuário dá uma quantidade exata ("10 melhores", "top 5") —
   `limit` tem prioridade sobre `scope` e é aplicado como corte final
   depois de qualquer eixo de resolução, garantindo que "10" vira 10
   título, não a quantidade que aquele eixo devolveria por padrão.

   Clicar em "criar timeline" **não grava nada direto** — abre
   `CreateTimelineModal.tsx`: mostra a lista que `resolveTimelineMovies`
   (`functions.ts`) foi buscar (grade de pôsteres) e um campo pra
   "conversar"/ajustar o pedido antes de confirmar. Cada ajuste enviado
   vira mais uma linha na conversa e reprocessa o pedido inteiro
   (descrição original + todos os ajustes já feitos, em ordem, via
   `buildCombinedDescription`) pelo mesmo pipeline determinístico de
   sempre — não é a IA editando a lista anterior à mão, é a busca de novo
   com mais contexto, então cada ajuste herda as mesmas garantias
   (contagem exata, eixo certo pra pessoa/franquia/premiação/anime etc.).
   Só grava no Firestore (`createTimeline`) quando o usuário clica
   "Salvar timeline" dentro do modal; salvar recarrega `timelines`
   (`onSaved` → `onCreated` → `loadTimelines`) e fecha o modal — essa
   lista só serve pra "Últimos vistos" abaixo hoje, a grade de cards em
   si virou a página própria `@/pages/private/timelines`.

   **De onde vem a lista, por eixo** (`resolveTimelineMovies`,
   `functions.ts`): pessoa específica → `/person/{id}/combined_credits`
   do TMDb (completo, garantido); franquia específica →
   `/collection` do TMDb; premiação → busca real (Wikipédia etc.) por
   edição, batches de ~15 edições em paralelo. **Qualquer outro tema
   (gênero, época, "melhores de", anime etc.) → busca de verdade na
   internet via IA com Google Search (`resolveByAiSearch`), NÃO o
   `/discover` do TMDb.** Isso mudou depois de bug relatado pela
   Rebecca: pra anime, `/discover` com `genreNames=Animação` +
   `originCountry=JP` volta ranqueado pela popularidade crua do TMDb,
   não pelo que a comunidade considera bom anime de verdade — travar a
   busca num filtro de banco jogava fora a capacidade da IA de pesquisar
   fontes melhores (MyAnimeList, Letterboxd, crítica etc.). Os critérios
   já extraídos (gênero, país, época, ordenação, quantidade) ainda
   entram como instrução no prompt — "anime" continua implicando Japão,
   por exemplo — só que quem decide os títulos é a busca real, e o TMDb
   só resolve cada título nomeado (id, pôster) depois.

   O campo `reply` do modal (ver `respondToTimelineChat`) já explica
   isso quando perguntado — não inventa fonte nem finge não saber de
   onde veio a lista.
3. **"Timelines que você segue"** (`FollowedTimelinesRow.tsx`, extraído
   do JSX que vivia solto em `index.tsx`) — timelines com a estrela
   marcada em `@/pages/private/timelines` (`Timeline.followed`, ver
   `documents.md` de lá) **E categoria "filmes"**
   (`t.types.includes("filmes")`, filtro aplicado em `index.tsx` antes de
   passar pro componente — ele só renderiza o que recebe, não sabe de
   categoria). `fetchTimelines(uid)` + filtro client-side (não é query
   própria — poucas timelines por usuário, não compensa a complexidade de
   um `where`). Card mostra o pôster do primeiro filme como fundo
   (`timeline.movies[0]`), nome + barra de progresso por cima
   (`timelineProgress`/`progressPercent`, `service/TimelineSettings.ts`,
   usando o MESMO `watchedMap` de baixo). Clicar abre o MESMO
   `@/pages/private/timelines/TimelineDetail.tsx` da página Timelines
   (por isso esse componente importa o próprio `styles.scss` agora, não
   dá mais pra confiar que quem renderiza já carregou esse CSS). Some da
   seção se não seguir nenhuma.

   **`FollowedTimelinesRow` é reusado inteiro nas páginas Séries e
   Animes** (`@/pages/private/series/index.tsx`,
   `@/pages/private/anime/index.tsx`) — pedido explícito da Rebecca:
   "vamos fazer essa mesma estrutura inicial da página de filmes para a
   página de séries/animes... é o mesmo só que relativo a séries/animes".
   Cada página filtra a própria categoria (`t.types.includes("series")`/
   `"animes"` em vez de `"filmes"`) — mesmo componente, mesma classe
   `dashboard__timeline-*` (CSS já global), só a lista pré-filtrada muda.
   `HeroCarousel.tsx` e `CreateTimelinePanel.tsx` (com
   `categoryLock="series"`/`"animes"`, ver comentário lá e em
   `functions.ts` `resolveTimelineMovies`) também são reusados inteiros
   do mesmo jeito — nenhuma cópia, três componentes que agora servem as
   três páginas.
4. **"Últimos vistos"** (`MovieRow.tsx`) — lê DIRETO de
   `users/{uid}/watched` ordenado por `watchedAt`
   (`fetchRecentlyWatchedKeys`, `service/WatchedSettings.ts` — query de
   verdade, `orderBy`+`limit`, não fetch de tudo + sort no client) —
   pedido explícito da Rebecca: "a lista de últimos vistos deve ser pelo
   user -> watched -> watched_at". Cada doc de `watched` só guarda
   `watchedAt` (chave = `${mediaType}-${id}` do TMDb, ver
   `service/TimelineSettings.ts` `movieKey`) — `getRecentlyWatched`
   (`dashboard/functions.ts`) parseia a chave e resolve título/pôster no
   TMDb (`fetchTitleById`, `service/TMDbSettings.ts`) na hora, não
   duplica esse dado no Firestore. Async (é uma query), recarrega a cada
   toggle (`loadRecentlyWatched` em `index.tsx`) pra refletir na hora.
   NÃO cruza com as timelines do usuário pra decidir o que listar (isso
   é só o item 3 acima) — antes cruzava, e um filme só aparecia aqui se
   estivesse dentro de alguma timeline, o que escondia qualquer filme
   marcado "já vi" fora de timeline nenhuma (Em cartaz, busca,
   bilheteria). Some da tela se o usuário ainda não marcou nada.
5. **"Em cartaz em {cidade}"** (`MovieRow.tsx`) — lista REAL do
   ingresso.com pra cidade atual do usuário (pedido explícito da
   Rebecca: "os filmes que estão em cartaz não são os que estão
   mostrando lá na ingresso.com... o que deve estar ali na nossa lista
   são os mesmos filmes" + "a localização tem que estar certa"), não
   mais o `now_playing` genérico do TMDb.

   **Como isso funciona sem API/backend** (`service/IngressoSettings.ts`):
   ingresso.com não tem API pública e bloqueia fetch cross-origin de
   verdade (testado: `fetch` de fora do domínio deles dá "Failed to
   fetch"; de dentro funciona normal — é CORS mesmo). A única forma de
   ler a página deles do browser sem backend próprio é por um leitor
   CORS-friendly de terceiro, **r.jina.ai** (gratuito, sem chave, devolve
   a página em Markdown limpo) — `fetchIngressoNowPlaying(citySlug,
   limit)` busca `r.jina.ai/https://www.ingresso.com/filmes/em-cartaz?city={citySlug}`
   e faz parse com regex nos blocos `![Image N: Título](pôster-real-cdn-deles) ...](.../filme/{slug}?city=...)`
   — testado contra a página real, extrai título + pôster + **slug de
   verdade** (não adivinhado) num passo só. `?city={slug}` na URL deles
   força a cidade certa independente de qual IP fez a requisição
   (testado: proxy respondendo de IP de outra cidade + `?city=recife`
   devolveu a página de Recife certinha) — essencial já que quem
   requisita de fato é o servidor do leitor, não o navegador do usuário.
   Cidade vem de `fetchCurrentCityName` (`service/LocationSettings.ts` —
   geolocation do navegador + reverse geocoding via Nominatim/
   OpenStreetMap, também CORS-friendly) + `slugify` pro formato que o
   ingresso.com espera (minúsculo, sem acento, espaço vira "-").

   **Fragilidade assumida**: r.jina.ai é serviço de terceiro, pode sair
   do ar/mudar formato/limitar taxa a qualquer momento. Por isso
   `loadNowPlaying` (`index.tsx`) sempre tem fallback: geolocation
   negada OU busca no ingresso.com falhando por qualquer motivo cai pro
   `fetchNowPlayingBrazil` do TMDb de sempre (nacional, não da cidade de
   verdade) com link adivinhado via `buildIngressoMovieUrl` (pode falhar
   pra filme com sufixo que só o ingresso.com sabe, tipo relançamento —
   sem API pra validar, não dá pra detectar isso do client).

   **Cada título é re-resolvido no TMDb** (`fetchIngressoNowPlayingResolved`,
   `functions.ts`) — a LISTA (quais filmes) vem do ingresso.com, mas o
   pôster/id/mediaType de cada card vêm do TMDb (`searchMovieByTitle`,
   sem ano — título do ingresso.com não vem com ano, então busca só por
   nome, o que na prática já favorece o lançamento atual entre
   homônimos porque o `/search/movie` do TMDb ordena por popularidade).
   Corrige a regressão relatada: "não tem mais a mesma imagem dos
   outros filmes, e não [tem] o botão pra dar check" — antes o pôster
   vinha direto do CDN do ingresso.com e sem `id`/`mediaType` nenhum, sem
   `WatchButton`. Sufixo tipo "(Relançamento)"/"(Dublado)" não existe
   como filme separado no TMDb — tenta primeiro sem esse sufixo
   (`stripTrailingParenthetical`) antes do título cru. Quando NENHUMA
   busca acha o filme no TMDb (raro — show/concert film sem cadastro
   lá, ex.: "Linkin Park: Unshatter"), o filme continua na lista mesmo
   assim (não soma de novo, ver item abaixo), só sem `id`/`mediaType`
   (sem `WatchButton`) e com o pôster do próprio ingresso.com como
   fallback só pra esse item.

   **Traz TODOS os filmes da página real deles**, não só os primeiros —
   `INGRESSO_LIMIT = 40` (`index.tsx`) é só uma rede de segurança (a
   página deles hoje costuma ter entre 20 e 35 títulos), não um corte de
   verdade; antes usava o mesmo `ROW_LIMIT = 8` das outras fileiras, que
   cortava a maior parte da lista real (regressão relatada: "não ta
   trazendo todos os filmes em cartaz").

   **Único `onItemClick` que NÃO abre `MovieDetail`** — pedido explícito
   da Rebecca: "quando a gente clicar abre as sessões do filme lá na
   ingresso.com". Abre `item.href` (slug real extraído da página deles,
   ou o fallback adivinhado se a lista inteira caiu pro TMDb) numa aba
   nova — independente do card ter `id`/`mediaType` do TMDb ou não, já
   que isso é sobre o link do ingresso.com, resolvido à parte. Cada item
   ganha um `rankLabel: "Comprar ingresso"` (reaproveitando o mesmo selo
   usado pelo "Nº lugar" da bilheteria) como pista visual de que o
   clique aqui é diferente do resto das fileiras. `MovieRowItem.id`/
   `mediaType` continuam opcionais (`MovieRow.tsx`) pro caso raro de
   título sem match no TMDb.
6. **"Campeões de bilheteria {ano}"** (`MovieRow.tsx`) — TOP 20 do ano
   (`BOX_OFFICE_LIMIT = 20`, `index.tsx` — pedido explícito da Rebecca,
   não o `ROW_LIMIT = 8` genérico das outras fileiras). TMDb não tem
   bilheteria pronta; `fetchBoxOfficeChampions` usa
   `/discover/movie?sort_by=revenue.desc&primary_release_year={ano
   atual}` como proxy real, com `vote_count.gte=300` — sem esse piso o
   sort vem contaminado por título obscuro com dado de revenue
   errado/vandalizado (TMDb é editado pela comunidade), rankeando acima
   de bilheteria de verdade. Cada item mostra "Nº lugar".
7. **Rodapé** — só a logo agora. Tinha a busca "PROCURAR FILME" também
   (`searchMovies`, TMDb `/search/multi`) até virar o ícone de lupa
   GLOBAL da navbar — pedido explícito da Rebecca: "essa barra de search
   que a gente tem no final das páginas filmes/séries/animes pode sair
   dali e virar só um ícone de lupa no navbar, quando o usuário clica,
   então aparece o modal pra ele fazer a busca". `searchMovies` (esta
   pasta) continua existindo — é a função que
   `@/components/searchModal` (modal global, usado pelas 3 páginas)
   importa direto daqui, mesma busca de sempre, só chamada de outro
   lugar agora.

Clicar em qualquer pôster do Dashboard (últimos vistos/em cartaz/
bilheteria) abre o modal `@/components/movieDetail` com todos os
detalhes do TMDb (sinopse, gêneros, nota, direção/criação, elenco). Todo
pôster (`MovieRow.tsx`) também tem o
`@/components/watchButton` global sobreposto no canto — clique
independente do de abrir o detalhe (`stopPropagation` dentro do próprio
botão), toggle de "já vi" (`handleToggleWatched` em `index.tsx`, escreve
no estado global de `service/WatchedSettings.ts`, mesmo usado pelas
timelines e pela página Oscar).

**Navegação da fileira** (`MovieRow.tsx`) — seta (chevron) dos dois
lados, `scrollBy` suave em cima de `.dashboard__row-posters`
(`overflow-x: auto`, scrollbar nativa escondida via `scrollbar-width:
none`/`::-webkit-scrollbar{display:none}` — a navegação é só pelas
setas agora). Cada seta desabilita sozinha quando não tem mais pôster
pra ver naquela direção (`canScrollLeft`/`canScrollRight`, recalculado
no `scroll`/`resize`/troca de itens via `updateScrollState`). Quando
cabe tudo sem precisar rolar (`hasOverflow` falso — poucos itens),
`.dashboard__row-posters--centered` centraliza a fileira em vez de
deixar grudada na esquerda.

`posterUrl`/`searchTmdbTitle`/`TmdbMovie` vivem em
`service/TMDbSettings.ts` — eram do wizard antes, migraram pra lá quando
ele saiu, já que várias telas fora daqui também precisam (ex.:
`@/components/movieDetail`).

## Onde foi parar o resto

- **Grade "Minhas timelines"** (cards + progresso + apagar + abrir
  `TimelineDetail`) → `@/pages/private/timelines` (`documents.md` lá).
- **Nav** → `@/components/appNav` (nav global, ver `PrivateLayout.tsx`).

## Não implementado ainda (fora de escopo dessa rodada)

- Dropdown "Explore" da nav.
