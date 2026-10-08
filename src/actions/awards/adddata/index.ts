import { READ_ACCESS_TOKEN } from "@/service/TMDbSettings";
import { parseAwardCategoriesJson, saveAwardEditionData, type AwardCategory, type AwardConfig, type AwardEdition } from "@/actions/awards/editions";

// Exemplo do JSON que o usuário cola no "Adicionar dados" (modelo de formato e placeholder).
// usado em: AddDataModal
export const buildExampleJson = (config: AwardConfig): string => `[
  {
    "name": "${config.bestCategoryName}",
    "nominees": [
      { "filmTitle": "Nome do Filme Vencedor", "filmYear": 2023, "isWinner": true, "tmdbId": 872585, "mediaType": "movie", "posterPath": null },
      { "filmTitle": "Outro Indicado", "filmYear": 2023, "isWinner": false, "tmdbId": 792307, "mediaType": "movie", "posterPath": null }
    ]
  },
  {
    "name": "Melhor Atriz",
    "nominees": [
      { "filmTitle": "Nome do Filme", "filmYear": 2023, "isWinner": true, "personName": "Nome da Atriz", "tmdbId": 792307, "mediaType": "movie", "posterPath": null }
    ]
  },
  {
    "name": "Melhor Diretor",
    "nominees": [
      { "filmTitle": "Nome do Filme", "filmYear": 2023, "isWinner": true, "personName": "Nome do Diretor", "tmdbId": 872585, "mediaType": "movie", "posterPath": null }
    ]
  }
]`;

// Prompt que o usuário copia e cola numa IA para ela devolver os indicados da edição já em JSON.
// usado em: AddDataModal
export const buildResearchPrompt = (config: AwardConfig, edition: AwardEdition): string => `Quero que você gere um JSON completo com todos os indicados da ${edition.ordinal}ª ${config.editionNoun} (${config.filmYearOffset ? `cerimônia de ${edition.ceremonyYear}, referente principalmente aos filmes de ${edition.filmYear}` : `edição de ${edition.ceremonyYear}, filmes exibidos/premiados nesse mesmo ano`}).

Use a API do TMDB para pesquisar e validar cada filme individualmente.

TMDB API Read Access Token:
${READ_ACCESS_TOKEN}

REQUISITOS:

1. Inclua todas as categorias competitivas presentes na ${edition.ordinal}ª edição do ${config.name}.
2. Inclua todos os indicados de cada categoria.
3. Marque corretamente o vencedor de cada categoria com "isWinner": true.
4. Para cada filme, consulte a API do TMDB e preencha obrigatoriamente:
   - filmTitle: título correspondente ao filme no TMDB
   - filmYear: ano de lançamento registrado no TMDB
   - isWinner: boolean
   - tmdbId: ID real do filme no TMDB
   - mediaType: "movie" (ou "tv" se a indicação for de uma série)
   - posterPath: poster_path real retornado pelo TMDB
5. NÃO coloque null, undefined, strings vazias ou dados inventados.
6. Valide os resultados do TMDB usando título + ano para evitar associar filmes antigos a remakes ou filmes homônimos.
7. Quando a indicação for atribuída a uma pessoa (Ator, Atriz, Diretor etc.), inclua:
   - personName
8. Em categorias em que personName não se aplica, simplesmente não inclua essa propriedade.
9. Para categorias técnicas atribuídas nominalmente a profissionais, inclua os nomes oficiais dos indicados em personName.
10. Quando um mesmo trabalho for creditado a mais de uma pessoa (roteiro a quatro mãos, equipe de efeitos visuais, co-direção etc.), isso é UMA indicação só — personName deve listar todos os nomes juntos numa string só (ex.: "Fulano e Beltrano"), nunca uma linha por pessoa pro mesmo trabalho.
11. Não confunda o ano da cerimônia/edição (${edition.ceremonyYear}) com o ano de lançamento do filme. Use o ano real retornado/validado pelo TMDB.
12. Se determinado título antigo não existir no TMDB ou não possuir poster_path, NÃO invente dados. Identifique o problema antes de gerar o resultado final.
13. Não inclua prêmios honorários que não possuam concorrentes. Caso algum prêmio especial seja incluído, deixe-o claramente identificado como prêmio especial, separado das categorias competitivas.

FORMATO:

${buildExampleJson(config)}

IMPORTANTE:

Quero o JSON COMPLETO, não apenas exemplos. Pesquise TODOS os filmes da ${edition.ordinal}ª edição no TMDB antes de responder.

Não use tmdbId: null nem posterPath: null.

Se posterPath não existir, busque em fonte externa

Ao final, retorne SOMENTE o JSON válido, sem explicações, Markdown ou \`\`\`json.`;

// Ciclo "adicionar dados de uma edição": valida o JSON colado e grava no Firestore.
// usado em: AddDataModal
export const saveEditionFromJson = async (config: AwardConfig, edition: AwardEdition, jsonText: string): Promise<{ headline: string; categories: AwardCategory[] }> => {
  const categories = parseAwardCategoriesJson(jsonText);
  const headline = await saveAwardEditionData(config, edition.ordinal, categories);
  return { headline, categories };
};
