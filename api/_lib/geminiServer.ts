// Chamada ao Gemini feita pelo servidor, para os fluxos que passam pelo backend (hoje, as Sugestões da IA).
// A chave vai só no cabeçalho do pedido ao Google: nunca na URL e nunca nos logs. Pode ser a do servidor ou a da própria pessoa (que chega no corpo do pedido).
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_FALLBACK_MODEL = "gemini-flash-latest";
const CALL_TIMEOUT_MS = 25_000;
const RETRY_DELAYS_MS = [1_000, 2_500];

const isTransient = (status: number): boolean => status === 500 || status === 503;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Erro do Gemini com o status que o frontend deve receber (ex.: 429 = cota esgotada).
export class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const callModel = async (model: string, apiKey: string, body: string): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

// Pede ao Gemini uma resposta em JSON no formato do schema. Erro passageiro (500/503): espera e tenta de novo; se continuar, ou se a cota acabar (429), usa o modelo reserva.
// usado em: api/suggestions
export const generateJSON = async <T>(apiKey: string, isUserKey: boolean, prompt: string, schema: Record<string, unknown>): Promise<T> => {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  });

  try {
    let response = await callModel(GEMINI_MODEL, apiKey, body);
    for (const delay of RETRY_DELAYS_MS) {
      if (response.ok || !isTransient(response.status)) break;
      await sleep(delay);
      response = await callModel(GEMINI_MODEL, apiKey, body);
    }
    if (!response.ok && (isTransient(response.status) || response.status === 429) && GEMINI_MODEL !== GEMINI_FALLBACK_MODEL) {
      response = await callModel(GEMINI_FALLBACK_MODEL, apiKey, body);
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      const detail = errorBody?.error?.message;
      if (response.status === 401 || response.status === 403) {
        console.error(`Gemini recusou a chave (${response.status}, ${isUserKey ? "da pessoa" : "do servidor"}).`);
        throw new GeminiError(isUserKey ? 400 : 502, isUserKey ? "A sua chave do Gemini foi recusada. Confira em Configurações." : "A chave do Gemini do servidor foi recusada (GEMINI_API_KEY inválida ou sem permissão).");
      }
      throw new GeminiError(response.status, `Gemini respondeu ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new GeminiError(502, "Resposta do Gemini sem conteúdo.");
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    const timedOut = err instanceof Error && err.name === "AbortError";
    throw new GeminiError(timedOut ? 504 : 502, timedOut ? "Gemini demorou demais pra responder (timeout)." : "Falha ao falar com o Gemini.");
  }
};
