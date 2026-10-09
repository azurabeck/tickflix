import { auth } from "./FirebaseSettings";

const GEMINI_MODEL = "gemini-3.6-flash";
const geminiUrl = (model: string): string => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const GEMINI_FALLBACK_MODEL = "gemini-flash-latest";

const isTransientStatus = (status: number): boolean => status === 500 || status === 503;
const RETRY_DELAYS_MS = [1_000, 2_500];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const userGeminiKeyStorageKey = (uid: string): string => `tickflix-user-${uid}-gemini-key`;

// Chave do Gemini do próprio usuário, guardada só neste navegador.
// usado em Configurações (card da chave do Gemini) e aqui, para escolher entre a chave dele e a da plataforma.
export const getUserGeminiKey = (): string => {
  const uid = auth.currentUser?.uid;
  if (!uid) return "";
  try {
    return localStorage.getItem(userGeminiKeyStorageKey(uid)) ?? "";
  } catch {
    return "";
  }
};

// Guarda (ou remove, se vier vazia) a chave. usado em Configurações (card da chave do Gemini).
export const setUserGeminiKey = (value: string): void => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(userGeminiKeyStorageKey(uid), trimmed);
    else localStorage.removeItem(userGeminiKeyStorageKey(uid));
  } catch {
    // localStorage indisponível (ex.: aba anônima): segue sem salvar
  }
};

// Testa a chave na API do Google antes de guardar. usado em Configurações (card da chave do Gemini).
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

const GEMINI_TIMEOUT_MS = 45_000;

const generateWithUserKey = async <T>(apiKey: string, prompt: string, schema: GeminiSchema, useSearch: boolean): Promise<T> => {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const callModel = async (model: string): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      return await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Gemini demorou demais pra responder (timeout).");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  };

  // Erro transitório (500/503): espera e tenta de novo. Se continuar, usa o modelo reserva.
  let response = await callModel(GEMINI_MODEL);
  for (const delay of RETRY_DELAYS_MS) {
    if (response.ok || !isTransientStatus(response.status)) break;
    await sleep(delay);
    response = await callModel(GEMINI_MODEL);
  }
  if (!response.ok && (isTransientStatus(response.status) || response.status === 429)) {
    response = await callModel(GEMINI_FALLBACK_MODEL);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const detail = errorBody?.error?.message;
    throw new Error(`Gemini respondeu ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  const data = await response.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Resposta do Gemini sem conteúdo.");

  return JSON.parse(text) as T;
};

const BACKEND_TIMEOUT_MS = 65_000;

// O frontend pega o token do Firebase e envia o pedido para /api/gemini
const generateViaBackend = async <T>(prompt: string, schema: GeminiSchema, useSearch: boolean): Promise<T> => {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Faça login pra usar a IA.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  let response: Response;
  
  try {
    response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      signal: controller.signal,
      body: JSON.stringify({ prompt, schema, useSearch }),
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
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `API da IA respondeu ${response.status}`);
  }

  const { text } = (await response.json()) as { text?: string };
  if (!text) throw new Error("Resposta do Gemini sem conteúdo.");
  return JSON.parse(text) as T;
};

// Com a chave do próprio usuário (tela de Configurações), chama o Google direto
// do navegador. Sem ela, passa pelo backend (/api/gemini), que guarda a chave da
// plataforma no servidor — ela nunca vai pro bundle.
// usado na section "Sugestão da IA" (Filmes, Séries e Animes) e na criação de timeline por texto.
export const geminiGenerateJSON = async <T>(prompt: string, schema: GeminiSchema, useSearch = false): Promise<T> => {
  const userKey = getUserGeminiKey();
  return userKey ? generateWithUserKey<T>(userKey, prompt, schema, useSearch) : generateViaBackend<T>(prompt, schema, useSearch);
};

const SUGGESTIONS_TIMEOUT_MS = 65_000;

// Pede as sugestões da IA ao backend (/api/suggestions). Vai o token de login e, se a pessoa cadastrou a própria chave do Gemini,
// ela vai SÓ no corpo do pedido (HTTPS): nunca na URL, e o servidor não a guarda. Sem chave própria, o servidor usa a da plataforma.
// usado em: helpers/aisuggestion, presentation/problemgeminikey
export const callSuggestionsApi = async <T>(payload: object): Promise<T> => {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Faça login pra usar a IA.");

  const userKey = getUserGeminiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUGGESTIONS_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      signal: controller.signal,
      body: JSON.stringify(userKey ? { ...payload, geminiKey: userKey } : payload),
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
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `API da IA respondeu ${response.status}`);
  }
  return (await response.json()) as T;
};
