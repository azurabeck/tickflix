import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";
import { adminDb, getAdminApp } from "./_lib/firebaseAdmin.js";
import { GeminiError, generateJSON } from "./_lib/geminiServer.js";
import { tmdbFetchServer } from "./_lib/tmdbServer.js";
import { withAvailability } from "./_lib/dashboardData.js";

// Sugestões da IA, tudo no servidor. O frontend só diz o tipo (movie/tv) e a categoria (series/animes) e pede `load` (abrir a tela) ou `refresh` (renovar).
// O servidor confere o login, lê no Firebase o que a pessoa viu, avaliou e segue, escolhe a base de gosto, guarda as 3 sugestões do dia por usuário
// (em users/<uid>/suggestions, que só o servidor acessa) e, quando precisa, chama o Gemini e confirma cada título no TMDb.
// Resposta: { status: "ok" | "no-taste", basis: "ratings" | "watched" | null, slots: (cartão | null)[] }; um slot null está livre para renovar.
// A chave do Gemini é a da plataforma (GEMINI_API_KEY) ou a da própria pessoa (`geminiKey` no corpo, usada só nesta chamada, nunca guardada nem registrada).

const ALLOWED_LANGS = new Set(["pt-BR", "en-US", "es-ES"]);
const SLOTS = 3; // sugestões por dia
const EXTRA_REQUESTED = 6; // pede além do necessário para sobrar depois dos filtros
const MAX_ROUNDS = 3; // se depois dos filtros faltar sugestão, pede de novo (até 3 vezes)
const TASTE_BY_RATING = 10; // até 10 títulos mais bem avaliados
const TASTE_BY_RECENT = 12; // sem notas: até 12 títulos recentes vistos ou seguidos
const ANIMATION_GENRE_ID = 16;
const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

interface Body {
  action: "load" | "refresh";
  mediaKind: "movie" | "tv";
  category?: "series" | "animes";
  lang: string;
  timeZone: string;
  genres: string[];
  geminiKey?: string;
}

interface Suggestion {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  available: boolean;
}

interface Daily {
  day: string;
  slots: (Suggestion | null)[];
  history: string[]; // chaves (movie-1, tv-2) de tudo que já foi sugerido hoje, para não repetir
}

interface TasteTitle {
  title: string;
  year: string;
  rating: number | null;
}

interface RawSuggestion {
  title: string;
  year: number;
  mediaType: string;
}

// O que a pessoa tem no Firebase: título guardado (com categoria), nota, quando viu (filmes) e quando passou a seguir (séries e animes).
interface UserData {
  titles: Map<string, { title: string; year: string; category?: "series" | "animes" }>;
  ratings: Map<string, number>;
  checked: Map<string, number>; // filme visto ou série/anime seguido -> quando
  knownKeys: Set<string>; // tudo que ela já viu, avaliou ou segue
}

const SUGGESTIONS_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      year: { type: "INTEGER" },
      mediaType: { type: "STRING" },
    },
    required: ["title", "year", "mediaType"],
  },
};

const isStringArray = (value: unknown, max: number): value is string[] => Array.isArray(value) && value.length <= max && value.every((item) => typeof item === "string" && item.length <= 100);

// Confere o corpo do pedido; devolve null se algo estiver fora do formato.
const parseBody = (raw: unknown): Body | null => {
  const body = (raw ?? {}) as Record<string, unknown>;
  if (body.action !== "load" && body.action !== "refresh") return null;
  if (body.mediaKind !== "movie" && body.mediaKind !== "tv") return null;
  if (body.category !== undefined && body.category !== "series" && body.category !== "animes") return null;
  if (!isStringArray(body.genres ?? [], 30)) return null;
  if (body.geminiKey !== undefined && (typeof body.geminiKey !== "string" || body.geminiKey.length > 200)) return null;

  return {
    action: body.action,
    mediaKind: body.mediaKind,
    category: body.category as Body["category"],
    lang: typeof body.lang === "string" && ALLOWED_LANGS.has(body.lang) ? body.lang : "pt-BR",
    timeZone: typeof body.timeZone === "string" ? body.timeZone : DEFAULT_TIME_ZONE,
    genres: (body.genres ?? []) as string[],
    geminiKey: body.geminiKey as string | undefined,
  };
};

// A data de hoje (AAAA-MM-DD) no fuso da pessoa: as 3 sugestões valem até a meia-noite dela.
const todayIn = (timeZone: string): string => {
  try {
    return new Date().toLocaleDateString("sv-SE", { timeZone });
  } catch {
    return new Date().toLocaleDateString("sv-SE", { timeZone: DEFAULT_TIME_ZONE });
  }
};

// Lê no Firebase o que a pessoa viu, avaliou e segue (users/<uid>/watched e users/<uid>/following).
const readUserData = async (uid: string): Promise<UserData> => {
  const user = adminDb().collection("users").doc(uid);
  const [watched, following] = await Promise.all([user.collection("watched").get(), user.collection("following").get()]);

  const data: UserData = { titles: new Map(), ratings: new Map(), checked: new Map(), knownKeys: new Set() };
  for (const doc of watched.docs) {
    const record = doc.data() as { title?: string; year?: string; category?: "series" | "animes"; rating?: number; watchedAt?: number };
    data.knownKeys.add(doc.id);
    if (record.title) data.titles.set(doc.id, { title: record.title, year: record.year ?? "", category: record.category });
    if (typeof record.rating === "number") data.ratings.set(doc.id, record.rating);
    if (doc.id.startsWith("movie-") && typeof record.watchedAt === "number") data.checked.set(doc.id, record.watchedAt);
  }
  for (const doc of following.docs) {
    const series = doc.data() as { title?: string; year?: string; category?: "series" | "animes"; addedAt?: number };
    const key = `tv-${doc.id}`;
    data.knownKeys.add(key);
    data.checked.set(key, series.addedAt ?? 0);
    // o que a pessoa segue manda na categoria (série ou anime) do título
    data.titles.set(key, { title: series.title ?? data.titles.get(key)?.title ?? "", year: series.year ?? data.titles.get(key)?.year ?? "", category: series.category ?? "series" });
  }
  return data;
};

// Escolhe a base de gosto: os até 10 títulos mais bem avaliados do tipo/categoria; sem notas, até 12 recentes vistos ou seguidos.
const pickTaste = (data: UserData, mediaKind: Body["mediaKind"], category: Body["category"]): { basis: "ratings" | "watched" | null; taste: TasteTitle[] } => {
  const prefix = `${mediaKind}-`;
  const inCategory = (key: string): boolean => !category || data.titles.get(key)?.category === category;

  const rated = [...data.ratings.entries()]
    .filter(([key]) => key.startsWith(prefix) && inCategory(key))
    .sort(([keyA, a], [keyB, b]) => b - a || (data.checked.get(keyB) ?? 0) - (data.checked.get(keyA) ?? 0)) // empate: o marcado mais recentemente
    .slice(0, TASTE_BY_RATING)
    .map(([key]) => key);

  const recent = [...data.checked.entries()]
    .filter(([key]) => key.startsWith(prefix) && inCategory(key))
    .sort(([, a], [, b]) => b - a)
    .slice(0, TASTE_BY_RECENT)
    .map(([key]) => key);

  const basis = rated.length > 0 ? "ratings" : recent.length > 0 ? "watched" : null;
  const keys = basis === "ratings" ? rated : recent;
  const taste = keys.flatMap((key): TasteTitle[] => {
    const known = data.titles.get(key);
    return known?.title ? [{ title: known.title, year: known.year, rating: data.ratings.get(key) ?? null }] : [];
  });
  return { basis: taste.length > 0 ? basis : null, taste };
};

const describeTaste = (taste: TasteTitle[], basis: "ratings" | "watched"): string =>
  taste.map((t) => (basis === "ratings" && t.rating !== null ? `- ${t.title} (${t.year}) — nota do usuário: ${t.rating}/10` : `- ${t.title} (${t.year})`)).join("\n");

const buildPrompt = (body: Body, taste: TasteTitle[], basis: "ratings" | "watched", count: number, tried: string[]): string => {
  const { genres, mediaKind, category } = body;
  const kindWord = category === "animes" ? "animes (séries de animação japonesa)" : mediaKind === "tv" ? "séries" : "filmes";
  const onlyWord = category === "animes" ? "animes" : kindWord;
  const intro =
    basis === "ratings"
      ? "Estes são os filmes/séries preferidos do usuário, com a nota que ele mesmo deu (1 a 10) — quanto maior a nota, mais ele gostou:"
      : "O usuário ainda não deu notas, mas estes são os títulos que ele marcou como assistidos — deduza daí o tipo de conteúdo (gêneros, tom, época, país) que ele mais assiste:";
  const genresLine = genres.length > 0 ? `\nGêneros que o usuário disse preferir: ${genres.join(", ")}.` : "";
  const triedLine = tried.length > 0 ? `
- NÃO sugira também estes (já foram tentados): ${tried.join("; ")}.` : "";
  const otherKind = mediaKind === "tv" ? (category === "animes" ? "filmes nem séries que não sejam anime" : "filmes") : "séries";

  return `${intro}
${describeTaste(taste, basis)}
${genresLine}

Sugira ${count + EXTRA_REQUESTED} ${kindWord} (SOMENTE ${onlyWord}, nada de ${otherKind}) que combinem com esse gosto, em ordem do que mais combina pro que menos. Regras:
- NÃO sugira nenhum título da lista acima (o usuário já viu).${triedLine}
- Prefira títulos conhecidos o bastante pra existir no TMDb, de qualquer época.
- mediaType: sempre "${mediaKind}".
- title: título ORIGINAL, como apareceria numa busca no TMDb; year: ano de lançamento.
Responda só o JSON.`;
};

interface RawTmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  genre_ids?: number[];
  original_language?: string;
  origin_country?: string[];
}

// Anime = gênero Animação + produzido ou falado em japonês (a mesma regra do resto do app).
const isAnime = (result: RawTmdbSearchResult): boolean =>
  (result.genre_ids ?? []).includes(ANIMATION_GENRE_ID) && (result.original_language === "ja" || (result.origin_country ?? []).includes("JP"));

// Procura no TMDb o título que a IA sugeriu (nome, ano e tipo) para ter o id e o pôster reais, e fica com o primeiro resultado da categoria certa.
// Se com o ano não achar nada (a IA erra o ano com frequência), tenta de novo só pelo nome. Falha em um título não derruba os outros.
const findOnTmdb = async (item: RawSuggestion, body: Body): Promise<Omit<Suggestion, "available"> | null> => {
  const yearParam = body.mediaKind === "movie" ? "year" : "first_air_date_year";
  const fits = (result: RawTmdbSearchResult): boolean => (body.category === "animes" ? isAnime(result) : body.category === "series" ? !isAnime(result) : true);
  try {
    for (const params of [{ query: item.title, [yearParam]: String(item.year) }, { query: item.title }]) {
      const data = await tmdbFetchServer<{ results: RawTmdbSearchResult[] }>(`/search/${body.mediaKind}`, params, body.lang);
      const match = data.results.find(fits);
      if (match) return { id: match.id, mediaType: body.mediaKind, title: match.title ?? match.name ?? item.title, posterPath: match.poster_path };
    }
    return null;
  } catch (err) {
    console.error(`Erro ao resolver sugestão "${item.title}" no TMDb:`, err);
    return null;
  }
};

// Gera `count` sugestões novas: chama o Gemini, confirma no TMDb, tira os inválidos, os repetidos e os que a pessoa já tem (pelas chaves), e consulta onde assistir.
const generate = async (body: Body, apiKey: string, isUserKey: boolean, taste: TasteTitle[], basis: "ratings" | "watched", exclude: Set<string>, count: number, tried: string[]): Promise<Suggestion[]> => {
  const raw = await generateJSON<RawSuggestion[]>(apiKey, isUserKey, buildPrompt(body, taste, basis, count, tried), SUGGESTIONS_SCHEMA);
  if (!Array.isArray(raw)) throw new GeminiError(502, "Resposta do Gemini fora do formato esperado.");

  tried.push(...raw.map((item) => item.title));
  const found = await Promise.all(raw.map((item) => findOnTmdb(item, body)));
  console.log(`Sugestões: a IA sugeriu ${raw.length}, o TMDb confirmou ${found.filter(Boolean).length}, pedidas ${count}.`);
  const seen = new Set<string>();
  const chosen: Omit<Suggestion, "available">[] = [];
  for (const suggestion of found) {
    if (!suggestion) continue;
    const key = `${suggestion.mediaType}-${suggestion.id}`;
    if (exclude.has(key) || seen.has(key)) continue;
    seen.add(key);
    chosen.push(suggestion);
    if (chosen.length === count) break;
  }
  return withAvailability(chosen, body.lang); // uma consulta por título; se uma falhar, o título fica como "indisponível"
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const authHeader = req.headers.authorization ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    res.status(401).json({ error: "Faça login pra usar a IA." });
    return;
  }
  let uid: string;
  try {
    uid = (await getAuth(getAdminApp()).verifyIdToken(idToken)).uid;
  } catch {
    res.status(401).json({ error: "Sessão inválida. Entre de novo." });
    return;
  }

  const body = parseBody(req.body);
  if (!body) {
    res.status(400).json({ error: "Pedido inválido." });
    return;
  }

  try {
    const data = await readUserData(uid);
    const { basis, taste } = pickTaste(data, body.mediaKind, body.category);

    // Um documento por usuário, tipo e categoria: users/<uid>/suggestions/movie | tv | anime
    const ref = adminDb().collection("users").doc(uid).collection("suggestions").doc(body.category === "animes" ? "anime" : body.mediaKind);
    const today = todayIn(body.timeZone);
    const saved = (await ref.get()).data() as Daily | undefined;
    let daily: Daily | null = saved && saved.day === today ? saved : null;

    // O que a pessoa já assistiu (filme visto) ou passou a seguir (série/anime) libera o slot, sem gerar outro no lugar.
    const before = JSON.stringify(daily?.slots);
    if (daily) daily = { ...daily, slots: daily.slots.map((slot) => (slot && data.checked.has(`${slot.mediaType}-${slot.id}`) ? null : slot)) };

    const empty = daily ? daily.slots.filter((slot) => slot === null).length : SLOTS;
    const mustGenerate = daily ? body.action === "refresh" && empty > 0 : true;

    if (mustGenerate && !basis) {
      if (daily && JSON.stringify(daily.slots) !== before) await ref.set(daily);
      res.status(200).json({ status: "no-taste", basis: null, slots: daily?.slots ?? [] });
      return;
    }

    if (mustGenerate && basis) {
      const userKey = body.geminiKey?.trim() || "";
      const apiKey = userKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
        return;
      }

      const current: Daily = daily ?? { day: today, slots: Array.from({ length: SLOTS }, () => null), history: [] };
      const exclude = new Set([...data.knownKeys, ...current.history]);
      const created: Suggestion[] = [];
      const tried: string[] = [];
      for (let round = 0; round < MAX_ROUNDS && created.length < empty; round++) {
        const more = await generate(body, apiKey, Boolean(userKey), taste, basis, exclude, empty - created.length, tried);
        for (const suggestion of more) {
          created.push(suggestion);
          exclude.add(`${suggestion.mediaType}-${suggestion.id}`);
        }
      }
      if (created.length === 0) throw new GeminiError(502, "A IA não devolveu nenhuma sugestão válida.");

      const queue = [...created];
      daily = { day: today, slots: current.slots.map((slot) => slot ?? queue.shift() ?? null), history: [...current.history, ...created.map((s) => `${s.mediaType}-${s.id}`)] };
      await ref.set(daily);
    } else if (daily && JSON.stringify(daily.slots) !== before) {
      await ref.set(daily);
    }

    res.status(200).json({ status: "ok", basis, slots: daily?.slots ?? [] });
  } catch (err) {
    if (err instanceof GeminiError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error("Erro ao gerar sugestões:", err instanceof Error ? err.message : "desconhecido");
    res.status(502).json({ error: "Falha ao gerar as sugestões." });
  }
}
