// src/pages/private/awards/AddDataModal.tsx
// Generalização de pages/private/oscar/AddDataModal.tsx — sem chamada de
// IA nenhuma DENTRO do app (ver functions.ts/documents.md pra história
// completa de por que). A pesquisa acontece fora, numa IA externa
// (ChatGPT, Claude, Gemini web etc. — a Rebecca escolhe): "Copiar prompt
// de pesquisa" copia um prompt pronto (pede o JSON no formato exato que
// esse app espera, com instrução de validar cada filme na API do TMDb
// antes de responder, já com o nome da premiação/categoria principal
// certos via `config`) — ela cola isso na IA de sua preferência, cola a
// resposta de volta aqui, e só então isso grava em
// {config.collectionName}/{ordinal} (Firestore).
import { useState } from "react";
import { Check, Clipboard, FileJson, Loader2, X } from "lucide-react";
import { READ_ACCESS_TOKEN } from "@/service/TMDbSettings";
import type { AwardConfig } from "./awardConfigs";
import { parseAwardCategoriesJson, saveAwardEditionData, type AwardCategory, type AwardEdition } from "./functions";

interface AddDataModalProps {
  config: AwardConfig;
  edition: AwardEdition;
  onClose: () => void;
  onSaved: (headline: string, categories: AwardCategory[]) => void;
}

// Exemplo mínimo — só pra mostrar a FORMA esperada (referência visual no
// placeholder do textarea), com o nome da categoria principal de cada
// premiação já certo (`config.bestCategoryName`).
const buildExampleJson = (config: AwardConfig): string => `[
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

// Prompt pra IA externa (com acesso a busca/ferramentas) pesquisar e
// validar cada filme no TMDb antes de responder — o app não faz mais
// essa chamada, só monta o texto do pedido, parametrizado pelo nome da
// premiação/edição/ano de `config`+`edition`.
const buildResearchPrompt = (config: AwardConfig, edition: AwardEdition): string => `Quero que você gere um JSON completo com todos os indicados da ${edition.ordinal}ª ${config.editionNoun} (${config.filmYearOffset ? `cerimônia de ${edition.ceremonyYear}, referente principalmente aos filmes de ${edition.filmYear}` : `edição de ${edition.ceremonyYear}, filmes exibidos/premiados nesse mesmo ano`}).

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

const AddDataModal = ({ config, edition, onClose, onSaved }: AddDataModalProps) => {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildResearchPrompt(config, edition));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Erro ao copiar prompt:", err);
      setError("Não consegui copiar — copia manualmente pelo console, ou tenta de novo.");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);

    let categories: AwardCategory[];
    try {
      categories = parseAwardCategoriesJson(jsonText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON inválido.");
      return;
    }

    setSaving(true);
    try {
      const headline = await saveAwardEditionData(config, edition.ordinal, categories);
      onSaved(headline, categories);
    } catch (err) {
      console.error("Erro ao gravar dados da edição no Firestore:", err);
      setError(err instanceof Error ? err.message : "Não foi possível gravar agora.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="awards__detail-overlay" onClick={onClose}>
      <div className="awards__add-data-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="awards__detail-close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <h2 className="awards__add-data-title">
          Adicionar dados <span>· {edition.ordinal}ª {config.editionNoun}, {edition.ceremonyYear}</span>
        </h2>
        <p className="awards__add-data-hint">
          Copia o prompt de pesquisa abaixo e cola numa IA com acesso a ferramentas (ChatGPT, Claude, Gemini...) —
          ela pesquisa e valida cada filme no TMDb. Cola o JSON que ela responder aqui embaixo e salva.
        </p>

        <button type="button" className="awards__add-data-copy-prompt" onClick={handleCopyPrompt}>
          {copied ? <Check size={14} /> : <Clipboard size={14} />}
          {copied ? "Prompt copiado!" : "Copiar prompt de pesquisa"}
        </button>

        <textarea
          className="awards__add-data-textarea"
          placeholder={buildExampleJson(config)}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
        />

        {error && <p className="awards__error">{error}</p>}

        <div className="awards__add-data-actions">
          <button type="button" className="awards__add-data-cancel" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="awards__resolve-button" onClick={handleSave} disabled={saving || !jsonText.trim()}>
            {saving ? <Loader2 className="awards__spinner" size={15} /> : <FileJson size={15} />}
            Salvar no Firestore
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDataModal;
