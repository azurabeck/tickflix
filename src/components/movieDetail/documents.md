# MovieDetail

Modal com todos os detalhes de um filme/série do TMDb — abre por cima da
tela ao clicar num pôster em qualquer lugar do app: grade da
`TimelineDetail`, "Últimos vistos"/"Em cartaz Brazil"/"Campeões de
bilheteria" (`home/dashboard`, via `MovieRow`) e os resultados da busca do
rodapé.

## Props

| prop        | tipo               | descrição                                  |
| ----------- | ------------------ | -------------------------------------------- |
| `id`        | `number`           | id do TMDb                                    |
| `mediaType` | `"movie" \| "tv"`  | decide se busca em `/movie/{id}` ou `/tv/{id}`|
| `onClose`   | `() => void`       | fecha o modal (clique fora, X ou Esc)         |

## Como usar

```tsx
const [selected, setSelected] = useState<{ id: number; mediaType: "movie" | "tv" } | null>(null);

<Poster onClick={() => setSelected({ id: movie.id, mediaType: movie.mediaType })} />

{selected && <MovieDetail id={selected.id} mediaType={selected.mediaType} onClose={() => setSelected(null)} />}
```

`functions.ts` (`fetchMovieDetail`) busca `/movie/{id}` ou `/tv/{id}` com
`append_to_response=credits` e normaliza os dois formatos (filme tem
`runtime`, série tem `seasons`/`episodes`) num único `MovieDetail`:
sinopse, pôster, backdrop, data, gêneros, nota, direção/criação e elenco
(10 primeiros).

## Onde assistir

Seção "Onde assistir" no fim do modal — pedido explícito da Rebecca:
"a gente tem que chamar o tmdb pra ver os detalhes do filme... todos os
detalhes disponíveis, mas principalmente onde ta disponível para
assistir no current location". `fetchWatchProviders(id, mediaType,
countryCode)` (`functions.ts`) busca `/movie|tv/{id}/watch/providers`
(dado é do JustWatch, redistribuído pelo TMDb) e filtra pelo país do
usuário — streaming (`flatrate`), aluguel (`rent`) e compra (`buy`),
cada grupo só aparece se tiver provedor.

`countryCode` vem de `fetchCurrentLocation`
(`service/LocationSettings.ts` — mesma geolocation+reverse geocoding já
usada em "Em cartaz", agora cacheada em memória pra não pedir permissão/
bater no Nominatim de novo a cada modal aberto); sem localização
disponível, cai pro fallback `"BR"` (mesma escolha já feita em "Em
cartaz Brazil"). O endpoint do TMDb é por PAÍS, não cidade — não tem
"disponível no seu bairro", só no país.

Busca dos provedores roda em paralelo com `fetchMovieDetail`, com seu
próprio loading/erro independente — falhar em achar "onde assistir" não
trava o resto do modal (sinopse/elenco continuam aparecendo normal).

**Atribuição obrigatória**: os termos do TMDb pra esse endpoint exigem
mostrar "Fornecido por JustWatch" com link de volta (`providers.link`)
quando o dado é exibido — não é só um nice-to-have, é condição de uso
dos dados.
