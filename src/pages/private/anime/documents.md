# Animes

Página própria (rota `/animes`, nav "Animes" entre Séries e Oscar —
`@/components/appNav`). Pedido explícito da Rebecca: "vamos fazer uma
página exatamente igual, mesma lógica e layout... para animes" — é a
página Séries (`@/pages/private/series`) inteira, com a condição de
anime **invertida**: lá exclui anime das fileiras de descoberta
(`isAnime`, `series/functions.ts`), aqui só ENTRA quem é anime. Mesma
definição de anime nos dois lugares (e em `home/dashboard/functions.ts`,
`extractThemeFilters`): gênero Animação (id 16 no TMDb) + produzido no
Japão (idioma original "ja" OU país de origem "JP").

## Reuso, não duplicação

Só duas coisas são realmente diferentes de Séries: **quem entra na
descoberta** (`anime/functions.ts` — filtra `isAnime` em vez de excluir)
e **a categoria gravada ao seguir** (`category: "animes"`,
`service/FollowingSettings.ts`). Todo o resto é reusado direto, sem
cópia:

- `SeriesRow`/`SeriesDetail`/`ScrollableRow`
  (`@/pages/private/series/*`) — nenhum dos três sabe a diferença entre
  série e anime, só renderizam o que recebem. `SeriesRow` ganhou dois
  props novos (`addLabel`/`removeLabel`, default "...minhas séries") só
  pra essa página poder mostrar "Adicionar aos meus animes"/"Remover dos
  meus animes" sem duplicar o componente inteiro por causa de duas
  strings.
- `STREAMING_PROVIDERS`/`countryFlagEmoji`/`fetchSeriesWithEpisodes`
  (`@/pages/private/series/functions`) — mesma lista de provedor (já
  conferida contra a API), mesma resolução de temporada+episódio de um
  id do TMDb (não tem nada de "série" ali, funciona pra qualquer show).
- `HeroCarousel`/`CreateTimelinePanel`/`FollowedTimelinesRow`
  (`@/pages/private/home/dashboard`) — mesmas três peças que a página
  Séries já reusa da Home, com `categoryLock="animes"` no painel de
  criar timeline e filtro `types.includes("animes")` na fileira de
  timelines seguidas.
- **O CSS inteiro** — `index.tsx` importa
  `@/pages/private/series/styles.scss` e usa as MESMAS classes
  `series-page__*` (não um `anime-page__*` próprio). Decisão deliberada:
  é literalmente o mesmo layout (pedido explícito: "mesma lógica e
  layout"), duplicar ~600 linhas de SCSS idêntico só trocando o prefixo
  da classe não agregava nada. Mesmo raciocínio já usado pra
  `SeriesDetail`/`ScrollableRow`/`SeriesRow` (reuso de COMPONENTE), só
  que agora pro stylesheet inteiro da página. Quem inspecionar o DOM da
  página Animes vai ver classe `series-page__...` em tudo — é
  intencional, não um bug de copiar/colar.

`anime/functions.ts` duplica (não reusa) a mecânica de ponderação por
voto (`weightedRating`/`fetchWeightedTopAnime`) e de trailer
(`pickBestTrailer`/`isLikelyDubbed`) que já existem em
`series/functions.ts` — são private naquele arquivo (não exportadas) e a
única diferença real é a condição do filtro (`isAnime` vs `!isAnime`),
não valia a pena promover pra um serviço compartilhado só por isso.

## `service/FollowingSettings.ts` — categoria compartilhada

`users/{uid}/following` é a MESMA collection usada pelas duas páginas —
não tem diferença de FORMA entre "seguir uma série" e "seguir um anime"
(mesmo esquema temporada/episódio). O que diferencia é só
`FollowedSeries.category: "series" | "animes"`, decidido por QUAL
PÁGINA o usuário clicou "seguir" (mesmo raciocínio de `Timeline.types`,
`service/TimelineSettings.ts` — não é inspeção de gênero/país no TMDb).
Cada página filtra a própria: "Minhas séries" mostra `category ===
"series"`, "Meus animes" mostra `category === "animes"`. Doc gravado
antes desse campo existir (só a página Séries existia ainda) não tem
`category` — tratado como `"series"` na leitura (`fetchFollowedSeries`).

**Limitação conhecida, aceita**: um título já seguido por UMA página
(ex.: anime seguido pela página Animes) e "adicionado" de novo pela
OUTRA (ex.: achado numa busca da página Séries, que não filtra anime —
mesma decisão de sempre, "se a pessoa procurou o nome, mostra") não faz
nada — `followSeries` já tem um guard "se o doc existe, não sobrescreve"
(pra não perder progresso), então o clique simplesmente não muda a
categoria gravada; o título continua "preso" na categoria original e não
aparece como seguido na página onde foi "adicionado" de novo. Caso raro
(a mesma pessoa segue o mesmo título nas duas páginas), não vale a
complexidade de virar `categories: FollowedCategory[]` só por isso.

## `resolveTimelineMovies` — `categoryLock`

`home/dashboard/functions.ts` — o painel "criar timeline" tem três
instâncias agora (Home sem lock, Séries `categoryLock="series"`, Animes
`categoryLock="animes"`). Pra `"animes"`, além de travar
`filters.mediaTypes=["tv"]` (mesmo que `"series"`), injeta gênero
"Animação" + país de origem "JP" nos filtros ANTES de resolver — sem
isso "animes" cairia no mesmo resultado de "series" e traria desenho
ocidental junto. `describeFiltersForPrompt` já inclui esses dois
critérios no prompt da busca por IA automaticamente (não precisou de
instrução própria pra anime, só a que já existia genérica pra
"série/filme").

## Não implementado ainda (fora de escopo dessa rodada)

- Mesmas ressalvas da página Séries: "melhor avaliado" é nota do TMDb
  (não audiência real), "mais visto no ano" é volume de voto acumulado
  (não só desse ano) — ver `series/documents.md` pro histórico completo
  dos ajustes de critério.
- Limitação de categoria "presa" descrita acima.
