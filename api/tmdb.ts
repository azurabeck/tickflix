import type { VercelRequest, VercelResponse } from "@vercel/node";
import { tmdbFetchServer } from "./_lib/tmdbServer.js";

// Repassa ao TMDb os pedidos de leitura do app (`/api/tmdb?path=/search/movie&query=...`). O navegador não fala mais com o TMDb:
// o servidor usa a chave dele, limita os pedidos simultâneos e tenta de novo quando o TMDb recusa (429).
// Só aceita os caminhos que o app usa (busca, detalhes, trailers, onde assistir e temporadas), para não virar um acesso aberto ao TMDb.

const ALLOWED_LANGS = new Set(["pt-BR", "en-US", "es-ES"]);

const ALLOWED_PATHS = [
  /^\/search\/(movie|tv|multi)$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/(movie|tv)\/\d+\/(videos|watch\/providers)$/,
  /^\/tv\/\d+\/season\/\d+$/,
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { path, language, ...rest } = req.query;
  if (typeof path !== "string" || !ALLOWED_PATHS.some((pattern) => pattern.test(path))) {
    res.status(400).json({ error: "Caminho do TMDb não permitido." });
    return;
  }

  const lang = typeof language === "string" && ALLOWED_LANGS.has(language) ? language : "pt-BR";
  const params = Object.fromEntries(Object.entries(rest).filter((entry): entry is [string, string] => typeof entry[1] === "string"));

  try {
    const data = await tmdbFetchServer<unknown>(path, params, lang);
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400"); // dado público do TMDb: o cache da Vercel e do navegador aproveita
    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao falar com o TMDb.";
    const status = Number(/TMDb respondeu (\d+)/.exec(message)?.[1]) || 502; // repete o status do TMDb (ex.: 404); senão, 502
    res.status(status).json({ error: message });
  }
}
