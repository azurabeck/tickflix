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
// A chave da PLATAFORMA fica só no servidor (`GEMINI_API_KEY`, api/gemini.ts):
// o navegador pede ao backend (`POST /api/gemini`, com o ID token do
// Firebase), que repete em erro transitório e cai num modelo reserva — a
// chave nunca vai pro bundle. Quem configurou a PRÓPRIA chave (Configurações)
// chama o Google direto daqui, com a chave dele (que só existe no
// localStorage dele), e essa sempre ganha da da plataforma.
// Modelo usado só no caminho com a chave do próprio usuário (o do servidor é
// `GEMINI_MODEL`, em api/gemini.ts).
const GEMINI_MODEL = "gemini-3.6-flash";
const geminiUrl = (model: string): string => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Modelo reserva (alias que o Google mantém apontando pro Flash atual): se o
// principal estiver sobrecarregado (503) mesmo depois de tentar de novo, a
// chamada cai pra ele em vez de falhar.
const GEMINI_FALLBACK_MODEL = "gemini-flash-latest";

// Erros transitórios (sobrecarga/limite) — vale tentar de novo.
// 429 (cota esgotada) NÃO entra: repetir só gasta mais cota.
const isTransientStatus = (status: number): boolean => status === 500 || status === 503;
const RETRY_DELAYS_MS = [1_000, 2_500];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
// Caminho da chave do próprio usuário: direto no Google, com as mesmas
// tentativas/modelo reserva do servidor.
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

  // Modelo principal com até 2 novas tentativas (1s, 2,5s) em erro transitório
  // ("high demand", 503) e, se continuar, uma tentativa no modelo reserva.
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
    // Inclui a mensagem de erro da própria API (ex.: "model X is no
    // longer available") — bem mais rápido de debugar que só o status.
    const errorBody = await response.json().catch(() => null);
    const detail = errorBody?.error?.message;
    throw new Error(`Gemini respondeu ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  const data = await response.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Resposta do Gemini sem conteúdo.");

  return JSON.parse(text) as T;
};

// Caminho da plataforma: pede ao backend (api/gemini.ts), que tem a chave.
// O servidor já faz as tentativas/modelo reserva (até ~1 min no pior caso).
const BACKEND_TIMEOUT_MS = 65_000;

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

export const geminiGenerateJSON = async <T>(prompt: string, schema: GeminiSchema, useSearch = false): Promise<T> => {
  // Chave do próprio usuário (Configurações) sempre ganha da chave
  // compartilhada da plataforma — mesma regra do mailbook.
  const userKey = getUserGeminiKey();
  return userKey ? generateWithUserKey<T>(userKey, prompt, schema, useSearch) : generateViaBackend<T>(prompt, schema, useSearch);
};
