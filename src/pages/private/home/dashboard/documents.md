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
6.5. **"Principais lançamentos dos últimos 12 meses"** (`MovieRow.tsx`,
   logo abaixo da bilheteria) — pedido explícito da Rebecca: "vamos
   colocar uma lista ali com os principais lançamentos do ano no
   ocidente, do mes atual para janeiro... e vamos colocar um simbolo de
   claquete para os que já tiverem disponiveis para ver via streaming ou
   aluguel" — o período virou janela ROLANTE ao vivo: "melhor melhor..
   invez de ser no ano atual.. nos ultimos 12 meses" (ano calendário
   encolheria a lista perto de janeiro).

   `fetchRecentMajorReleases` (`functions.ts`, `MAJOR_RELEASES_LIMIT =
   20`): `/discover/movie` com `primary_release_date.gte/lte` cobrindo
   hoje menos 12 meses até hoje (`region: "BR"`, mesma data de
   lançamento usada em "Em cartaz"), `sort_by=popularity.desc` (é sobre
   RELEVÂNCIA — "principais" —, não bilheteria especificamente, que já
   tem a própria fileira) + `vote_count.gte=80` (piso mais baixo que o
   da bilheteria, 300: lançamento recente ainda não acumulou tanto
   voto). "No ocidente" é a MESMA exclusão de anime já usada em toda a
   página Séries/Animes (gênero Animação + idioma original japonês) —
   excluída CLIENT-SIDE, não via `without_genres` na query (isso
   cortaria animação OCIDENTAL também, tipo Pixar/DreamWorks, que deve
   continuar aparecendo); por isso pagina (`releasesCandidatePages(limit)`,
   mesmo padrão de `fetchTopSeriesOfTheYear` em
   `pages/private/series/functions.ts`, só que o teto ESCALA com `limit`
   — a fileira pede 20, o modal "Ver tudo" abaixo pede bem mais, e um
   teto fixo não teria páginas suficientes pro segundo caso) até
   preencher o limite.

   **Claquete** — pedido explícito, "símbolo de claquete para os que já
   tiverem disponíveis para ver via streaming ou aluguel". Pra cada
   filme da lista, uma chamada A PARTE (`fetchWatchProviders`,
   reaproveitada direto de `@/components/movieDetail/functions` — mesma
   função que já resolve "onde assistir" no modal de detalhes, não
   duplicada aqui) verifica se tem `flatrate` (assinatura) OU `rent`
   (aluguel) pro Brasil; `buy` (compra avulsa) não conta — o pedido foi
   especificamente "streaming ou aluguel". Em paralelo pra todos os 20 de
   uma vez (mesmo raciocínio já aceito em `fetchHeroTrailers`: custo
   aceitável, TMDb aguenta). Falha ao resolver UM filme não derruba a
   lista — só esse item fica sem claquete (`available: false`).

   **Virou componente GLOBAL** — pedido explícito da Rebecca, um dia
   depois de ver a fileira pronta: "a claquete... deve aparecer em todos
   os lugares do site, pode virar um padrão do componente global de
   details". O selo (`@/components/availabilityBadge`, ícone
   `Clapperboard`, canto SUPERIOR ESQUERDO por padrão — mesmo visual de
   antes, só que extraído daqui) e o resolvedor
   (`fetchAvailabilityMap`/`isAvailableToWatch`, agora em
   `@/components/movieDetail/functions.ts`, reaproveitando o
   `fetchWatchProviders` de sempre) deixaram de ser específicos dessa
   fileira — hoje aparecem em TODA tela com pôster do app: as outras
   fileiras da Home (`MovieRowItem` ganhou `availabilityMap` em vez de
   `available` individual), Séries/Animes (fileiras + "Minhas
   séries"/"Meus animes"), `TimelineDetail`, Franchise, Awards
   (`EditionDetail`) e `SearchModal` — cada tela resolve o próprio Map
   (`Map<string, true>` chaveado por `movieKey`, mesmo padrão do
   `watchedMap`), não existe cache cross-page. A fileira de lançamentos
   continua resolvendo `available` por filme sozinha (já faz a chamada
   junto da data de estreia, ver `fetchRecentMajorReleases`) e só
   converte pro Map na hora de passar pro `MovieRow.tsx`.

   **"Ver tudo" (`MajorReleasesModal.tsx`)** — pedido explícito da
   Rebecca, um dia depois de ver a fileira pronta: "coloca um botão ver
   tudo ali, nos lançamentos dos ultimos 12 meses, os fillmes deve estar
   agrupados por mes". Botão novo e genérico em `MovieRow.tsx`
   (`onSeeAll?`, renderizado num `&__row-header` que agora envolve título
   + botão — só a fileira de lançamentos passa essa prop hoje, as outras
   continuam sem botão nenhum). Abre um modal com busca PRÓPRIA
   (`fetchRecentMajorReleases(MODAL_LIMIT = 120)`, não reaproveita os 20
   já carregados na fileira) — só dispara quando o usuário realmente
   clica em "Ver tudo", pra não pagar ~120 chamadas de
   `/watch/providers` à toa pra quem nunca abre o modal.

   Agrupamento por mês acontece 100% client-side (`groupByMonth`,
   `MajorReleasesModal.tsx`) — particiona pelo recorte `YYYY-MM` de
   `releaseDate` (campo novo em `MajorReleaseMovie`, só pra isso; a
   fileira da Home ignora), ordena as CHAVES de mês mais recente primeiro
   (`localeCompare` em string `YYYY-MM` já ordena cronologicamente
   certo), mantém a ordem de popularidade de `fetchRecentMajorReleases`
   DENTRO de cada mês (não reordena de novo). Rótulo em português
   ("Outubro de 2026") vem de um array local de nomes de mês — não achei
   utilitário de data pt-BR já existente no app pra reaproveitar.

   **Filtro "Tudo"/"Disponível"** — pedido explícito da Rebecca, junto do
   pedido de virar componente global: "vamos colocar um filtro, nesse
   modal de ver tudo, para filtrar so o que tiver com claquete ou tudo".
   Dois botões-pílula acima da grade (`filter` local, `"all" |
   "available"`); `filteredMovies` aplica `m.available` ANTES de agrupar
   por mês (`groupByMonth` roda em cima do já filtrado, não dos 120
   inteiros) — mês sem nenhum filme disponível simplesmente some da lista
   nesse modo, com uma mensagem de vazio dedicada. Usa o ícone
   `Clapperboard` cru no botão (não o `AvailabilityBadge` em si — esse
   componente é `position: absolute`, pensado pra ficar sobreposto num
   pôster, não pra uso inline num botão de filtro).

   **Bug real, visto ao vivo**: "Pinóquio: Maldição de Madeira" aparecia
   em "Novembro" com a Rebecca testando em outubro — `releaseDate` vinha
   direto de `results[].release_date` do `/discover/movie`, que é SEMPRE
   a data PRIMÁRIA/global do filme no TMDb (normalmente EUA ou país de
   origem), mesmo passando `region: "BR"` na query (esse parâmetro só
   afeta o FILTRO `.gte/.lte`, não o campo devolvido). Corrigido com
   `fetchBrOrUsReleaseDate` (`functions.ts`, nome atualizado — ver 4º
   bug abaixo) — uma chamada a mais por filme
   em `/movie/{id}/release_dates` (único endpoint do TMDb com data POR
   PAÍS de verdade), que acha o bloco "BR" e usa a estreia de CINEMA
   (type 2/3) de lá; sem isso, cai pra qualquer data cadastrada pro
   Brasil, e só na ausência de bloco "BR" nenhum volta pro
   `release_date` genérico como último recurso. Rodada em paralelo com
   `fetchWatchProviders` (mesmo `Promise.allSettled` por filme, falha de
   uma chamada não derruba a outra nem a lista).

   **Limite real dessa correção** — conferido ao vivo na API do TMDb pra
   esse título específico (`/movie/1232569/release_dates`): o bloco "BR"
   só tem DOIS registros, nenhum em outubro — um tipo 1 (prévia/evento,
   25/set) e um tipo 3 (estreia de cinema, 12/nov; a Argentina e a
   Venezuela, vizinhas, já têm 29/out cadastrado pro mesmo filme — o
   Brasil especificamente ficou pra trás no catálogo deles). A correção
   garante que a app sempre usa o dado REAL por país em vez do genérico;
   pra esse filme específico, o dado real do TMDb pro Brasil também diz
   novembro — não tem como o app "adivinhar" outubro sem um dado de
   origem que diga isso. Vale a pena conferir de novo depois que o TMDb
   atualizar o cadastro desse título.

   **Terceiro bug real, encadeado com os dois acima** — pedido/relato
   explícito da Rebecca: "a gente deveria esta mostrando os filmes a
   partir do mes corrente... pq esta mostrando novembro?". Mesmo com a
   estreia de cinema no Brasil ainda no FUTURO (12/nov, depois de hoje),
   "Pinóquio" continuava aparecendo na lista — porque o FILTRO
   `.gte/.lte` do `/discover/movie` (que decide quem ENTRA na busca) usa
   a mesma data genérica/não-confiável de sempre pra essa decisão, não a
   data real por país; o filme entrou achando que tinha saído há pouco,
   quando na real (pro Brasil) nem tinha saído ainda. "Últimos 12 meses"
   é uma lista pra TRÁS no tempo — nunca deveria ter filme com estreia
   NO BRASIL ainda no futuro. Correção: um filtro A MAIS, depois de já
   ter resolvido a data real de cada filme (`releaseDate <= hoje`,
   `fetchRecentMajorReleases`) — descarta qualquer um cuja estreia real
   no Brasil ainda não tenha acontecido, não importa por que ele entrou
   no resultado do `/discover`. Pode devolver menos que `limit` quando
   isso acontece (aceito — uma lista menor e CORRETA é melhor que uma
   maior com filme do futuro dentro).

   **Quarta mudança, pedido explícito da Rebecca** (não exatamente um bug
   — um refinamento da regra): "vamos mostrar os filmes a partir da data
   de estreia brasil ou eua, estreia em outros lugares do mundo não me
   interessam.. brasil ou eua, o mais recenete [sic].. tipo de no brasil
   foi 29 de outubro e no usa foi 3 de novembro então mostra o filme em
   outubro". `fetchBrOrUsReleaseDate` (renomeada de `fetchBrReleaseDate`)
   agora resolve a estreia de cinema dos DOIS países (BR e US,
   `extractTheatricalDate` aplicado a cada um) e fica com a MAIS CEDO das
   duas (`"mais recenete"` na fala da Rebecca é "a que já aconteceu
   primeiro", não "a mais recente no calendário" — o próprio exemplo dela
   confirma: 29/out vence 3/nov). Com só um dos dois países cadastrado,
   usa esse; sem nenhum, cai pro `release_date` genérico como sempre.

   **Efeito colateral real, verificado ao vivo**: isso pode mover filme
   que ANTES estava "certo" (usando só o Brasil) pra um mês ANTERIOR
   agora, quando os EUA estreiam primeiro — não é regressão, é
   exatamente a regra pedida. Ex. real conferido na API do TMDb: "Zona
   Zero" tem BR=15/out mas US=28/ago — antes (só Brasil) aparecia em
   "Outubro"; com a regra nova (BR ou EUA, a mais cedo) passa pra
   "Agosto". Vale avisar a Rebecca que alguns títulos vão "voltar" de mês
   depois dessa mudança, não é bug novo.

   Rebecca perguntou se devia revisar a regra (só Brasil / Brasil com EUA
   só de reserva / manter como tá) depois de ver o mês atual esvaziar —
   escolha explícita: "Manter como está (a mais cedo das duas)". Fica
   registrado que ISSO é esperado: mês corrente (e às vezes o anterior)
   aparecer vazio/esparso é consequência mecânica da regra escolhida, não
   bug novo pra investigar nas próximas vezes.

   **Quinto bug real, visto ao vivo** — "Verity já deveria estar
   aparecendo na lista". Existe (TMDb id 1283515), estreava EXATAMENTE
   hoje no Brasil (1/out) e nos EUA (2/out) — passaria por TODOS os
   filtros (ocidental, não é futuro, BR/EUA resolvidos certinho) menos
   um: só 16 votos no TMDb (óbvio, acabou de sair, ninguém teve tempo de
   avaliar ainda), abaixo do piso `vote_count.gte=80` herdado da
   bilheteria. Corrigido baixando o piso pra 10 — justificativa: a
   bilheteria ordena por `revenue.desc` (campo fácil de vandalizar
   sozinho, daí o piso alto de 300 lá), mas essa fileira ordena por
   `popularity.desc`, um score já composto do próprio TMDb (visualização,
   tendência, votos etc.), bem mais resistente a um campo só vandalizado
   — não precisava do mesmo piso alto, e esse piso alto estava
   exatamente excluindo o tipo de filme que essa fileira existe pra
   mostrar (o lançamento NOVO, que ainda não teve tempo de acumular
   voto). Verity tem popularidade 74 (maior que vários títulos que já
   apareciam na lista) — só os votos é que eram poucos.

   Mesmo `MovieDetail` global ao clicar num pôster (`onSelectMovie`,
   literalmente `setSelectedMovie` de `index.tsx` passado direto) — como
   o modal é renderizado IRMÃO do `MovieDetail` na árvore (ambos filhos
   diretos de `.dashboard`, não um dentro do outro), não precisa do
   `stopPropagation` que `TimelineDetail`/`SearchModal` precisam quando
   aninham o `MovieDetail` de verdade — aqui não tem bubbling nenhum pra
   interceptar.
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
