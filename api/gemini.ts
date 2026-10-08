import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./_lib/firebaseAdmin.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_FALLBACK_MODEL = "gemini-flash-latest";
const CALL_TIMEOUT_MS = 25_000;
const RETRY_DELAYS_MS = [1_000, 2_500];
const MAX_PROMPT_CHARS = 30_000;

const isTransient = (status: number): boolean => status === 500 || status === 503;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const callGemini = async (model: string, apiKey: string, body: string): Promise<Response> => {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    return;
  }

  const authHeader = req.headers.authorization ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    res.status(401).json({ error: "Faça login pra usar a IA." });
    return;
  }
  try {
    await getAuth(getAdminApp()).verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: "Sessão inválida. Entre de novo." });
    return;
  }

  const { prompt, schema, useSearch } = (req.body ?? {}) as { prompt?: unknown; schema?: unknown; useSearch?: unknown };
  if (typeof prompt !== "string" || prompt.length === 0 || prompt.length > MAX_PROMPT_CHARS || typeof schema !== "object" || schema === null) {
    res.status(400).json({ error: "Pedido inválido." });
    return;
  }

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    ...(useSearch === true ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  });

  try {
    let response = await callGemini(GEMINI_MODEL, apiKey, body);
    for (const delay of RETRY_DELAYS_MS) {
      if (response.ok || !isTransient(response.status)) break;
      await sleep(delay);
      response = await callGemini(GEMINI_MODEL, apiKey, body);
    }
    if (!response.ok && (isTransient(response.status) || response.status === 429) && GEMINI_MODEL !== GEMINI_FALLBACK_MODEL) {
      response = await callGemini(GEMINI_FALLBACK_MODEL, apiKey, body);
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      const detail = errorBody?.error?.message;
      // 401/403 vindo do Google = a GEMINI_API_KEY do servidor está inválida ou sem permissão (não confundir com a sessão do usuário)
      if (response.status === 401 || response.status === 403) {
        console.error(`Gemini recusou a GEMINI_API_KEY do servidor (${response.status}): ${detail ?? "sem detalhe"}`);
        res.status(502).json({ error: "A chave do Gemini do servidor foi recusada (GEMINI_API_KEY inválida ou sem permissão)." });
        return;
      }
      res.status(response.status).json({ error: `Gemini respondeu ${response.status}${detail ? `: ${detail}` : ""}` });
      return;
    }

    const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      res.status(502).json({ error: "Resposta do Gemini sem conteúdo." });
      return;
    }
    res.status(200).json({ text });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    res.status(timedOut ? 504 : 502).json({ error: timedOut ? "Gemini demorou demais pra responder (timeout)." : "Falha ao falar com o Gemini." });
  }
}
