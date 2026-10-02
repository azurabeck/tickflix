// src/service/IASettings.ts
import { auth } from "./FirebaseSettings";

export const APP_NAME = "TickFlix";

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

// --- Chave do Gemini do próprio usuário -------------------------------------
// Pedido explícito da Rebecca, olhando como o projeto "mailbook"
// (livro-app) faz isso: "deve ensinar como pegar a api key do gemini, e
// deixar o usuário habilitar a propria apikey para utilizar no site" — tela
// em pages/private/settings. Com a própria chave, o uso (e o custo) passa a
// contar na conta Google de quem configurou, não na chave compartilhada da
// plataforma (`VITE_GEMINI_API_KEY` acima, que vira só o fallback — ver
// `geminiGenerateJSON` abaixo, chave do usuário sempre ganha dela).
//
// Guardada em localStorage, por uid (nunca sai do navegador de quem
// configurou, só é usada direto nas chamadas pro Google feitas daqui) —
// mesmo raciocínio do mailbook (lá: `service/userSettings.ts`).
const userGeminiKeyStorageKey = (uid: string): string => `tickflix-user-${uid}-gemini-key`;

export const getUserGeminiKey = (): string => {
  const uid = auth.currentUser?.uid;
  if (!uid) return "";
  try {
    return localStorage.getItem(userGeminiKeyStorageKey(uid)) ?? "";
  } catch {
    return ""; // localStorage indisponível (aba anônima etc.)
  }
};

export const setUserGeminiKey = (value: string): void => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(userGeminiKeyStorageKey(uid), trimmed);
    else localStorage.removeItem(userGeminiKeyStorageKey(uid));
  } catch {
    // não é crítico, ignora
  }
};

// Confere se a chave funciona ANTES de salvar (tela de Configurações) —
// listar os modelos é uma chamada leve, não gasta tokens de geração.
export const validateGeminiKey = async (apiKey: string): Promise<void> => {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
    headers: { "x-goog-api-key": apiKey },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.error?.message;
    throw new Error(`Gemini respondeu ${response.status}${detail ? `: ${detail}` : ""}`);
  }
};

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
  // Chave do próprio usuário (Configurações) sempre ganha da chave
  // compartilhada da plataforma — mesma regra do mailbook.
  const apiKey = getUserGeminiKey() || GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Nenhuma chave do Gemini configurada — adicione a sua em Configurações, ou configure VITE_GEMINI_API_KEY no .env.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
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
