// src/service/IASettings.ts
export const APP_NAME = "TickFlix";

export const APP_TAGLINE = "sua aventura vive no cinema";

// --- Gemini ---------------------------------------------------------------
// Usado pelo painel "Criar uma nova timeline" (único jeito de criar
// timeline hoje — o wizard guiado foi removido) pra interpretar a
// descrição livre do usuário e, quando não dá pra resolver por filtro
// estruturado do TMDb, enumerar títulos (ver
// src/pages/private/home/dashboard/functions.ts).
//
// ATENÇÃO: ao contrário do apiKey do Firebase/TMDb (públicos por design),
// uma chave do Gemini exposta no client pode ser extraída do bundle e
// abusada por terceiros, gerando custo de verdade na conta Google de quem
// gerou a chave. O certo seria essa chamada passar por uma Cloud Function
// como proxy — o projeto ainda não tem backend, e ficou definido usar
// direto do client por enquanto (mesma lógica do TMDb). Migrar pra uma
// function é a recomendação antes de ir pra produção com tráfego público.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiSchema = Record<string, unknown>;

// Perguntas sobre algo que o modelo não tem certeza (ex.: uma edição de
// premiação recente demais pra ter entrado nos dados de treino) fazem ele
// "pensar" bem mais tempo antes de responder — sem timeout, isso trava o
// spinner indefinidamente com zero feedback pro usuário. 45s é generoso o
// bastante pra respostas normais (as chamadas do wizard levam ~2-8s) sem
// deixar um caso ruim travado pra sempre.
const GEMINI_TIMEOUT_MS = 45_000;

/**
 * Pede pro Gemini gerar JSON estruturado seguindo `schema` (formato do
 * `responseSchema` da API: `{ type: "OBJECT" | "ARRAY" | "STRING" | ... }`).
 * Usar `responseMimeType: "application/json"` faz o modelo devolver só o
 * JSON, sem markdown/texto em volta — mais confiável que fazer parsing de
 * uma resposta livre.
 *
 * `useSearch: true` liga o grounding com busca do Google — sem isso o
 * modelo só responde com o que "decorou" no treino, o que falha pra
 * qualquer fato recente (ex.: indicados de uma premiação deste ano).
 * Testado direto na API: sem grounding, pergunta sobre uma edição recente
 * vem vazia; com grounding, vem certa. Custa um pouco mais de latência,
 * então só liga onde precisa de fato atual (ver generateAwardNominees).
 */
export const geminiGenerateJSON = async <T>(
  prompt: string,
  schema: GeminiSchema,
  useSearch = false
): Promise<T> => {
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY não configurada — ver .env.example.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Gemini demorou demais pra responder (timeout).");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    // Inclui a mensagem de erro da própria API (ex.: "model X is no
    // longer available") — bem mais rápido de debugar que só o status.
    const body = await response.json().catch(() => null);
    const detail = body?.error?.message;
    throw new Error(`Gemini respondeu ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  const data = await response.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Resposta do Gemini sem conteúdo.");

  return JSON.parse(text) as T;
};
