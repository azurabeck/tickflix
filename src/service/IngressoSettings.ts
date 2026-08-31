// src/service/IngressoSettings.ts
// Integração com o ingresso.com — "Em cartaz em {cidade}" da Home é a
// lista REAL deles (pedido explícito da Rebecca: "os filmes que estão
// em cartaz não são os que estão mostrando lá na ingresso.com... o que
// deve estar ali na nossa lista são os mesmos filmes"), não mais o
// now_playing genérico do TMDb.
//
// Ingresso.com não tem API pública e bloqueia fetch cross-origin de
// verdade — testado: `fetch` direto de um domínio de fora do deles dá
// "Failed to fetch" (CORS), mesmo fetch de DENTRO do domínio deles
// funciona normal. Sem backend/proxy próprio (esse projeto é 100%
// client-side), a única forma de ler a página deles do browser é por um
// leitor CORS-friendly de terceiro (r.jina.ai — gratuito, sem chave,
// devolve a página em Markdown limpo). Fragilidade real, assumida: é um
// serviço de terceiro, pode sair do ar ou limitar taxa — por isso
// `fetchIngressoNowPlaying` sempre é chamado com fallback pro TMDb (ver
// home/dashboard/index.tsx) se isso falhar por qualquer motivo.
//
// `?city={slug}` na URL deles força a cidade certa independente de qual
// IP fez a requisição (testado: proxy respondendo de um IP de São Paulo
// + `?city=recife` devolveu a página de Recife certinha) — essencial
// aqui já que quem faz a requisição de fato é o servidor do leitor, não
// o navegador do usuário.
const INGRESSO_BASE_URL = "https://www.ingresso.com";
const READER_PROXY_URL = "https://r.jina.ai/";

export const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Fallback só — usado quando por algum motivo não se tem a URL real (ver
// fetchIngressoNowPlaying abaixo, que já vem com o slug de verdade
// extraído da página deles, sem precisar adivinhar). Adivinhar o slug a
// partir só do título falha pra filme com sufixo que só o ingresso.com
// sabe (ex.: relançamento — "harry-potter-e-a-pedra-filosofal-relancamento",
// não derivável do título puro).
export const buildIngressoMovieUrl = (title: string): string => `${INGRESSO_BASE_URL}/filme/${slugify(title)}`;

export interface IngressoNowPlayingMovie {
  title: string;
  posterUrl: string;
  movieUrl: string;
}

// Cada filme em cartaz aparece na página deles como um bloco
// `![Image N: Título](https://ingresso-a.akamaihd.net/prd/img/movie/{slug}/{uuid}.webp) {classificação}](https://www.ingresso.com/filme/{slug}?city=...)`
// — captura título, pôster (CDN deles, real) e slug (real, não
// adivinhado) num passo só.
const MOVIE_BLOCK_PATTERN =
  /!\[Image \d+: ([^\]]+)\]\((https:\/\/ingresso-a\.akamaihd\.net\/prd\/img\/movie\/[^)]+)\)[^\]]*\]\(https:\/\/www\.ingresso\.com\/filme\/([a-z0-9-]+)\?city=/g;

export const fetchIngressoNowPlaying = async (citySlug: string, limit: number): Promise<IngressoNowPlayingMovie[]> => {
  const targetUrl = `${INGRESSO_BASE_URL}/filmes/em-cartaz?city=${citySlug}`;
  const response = await fetch(`${READER_PROXY_URL}${targetUrl}`);
  if (!response.ok) {
    throw new Error(`Leitor de página do ingresso.com respondeu ${response.status}`);
  }

  const markdown = await response.text();
  const movies: IngressoNowPlayingMovie[] = [];
  const seenSlugs = new Set<string>();

  for (const match of markdown.matchAll(MOVIE_BLOCK_PATTERN)) {
    const [, title, posterUrl, slug] = match;
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    movies.push({ title, posterUrl, movieUrl: `${INGRESSO_BASE_URL}/filme/${slug}` });
    if (movies.length >= limit) break;
  }

  if (movies.length === 0) {
    throw new Error("Não encontrei nenhum filme em cartaz na página do ingresso.com — formato da página pode ter mudado.");
  }

  return movies;
};
