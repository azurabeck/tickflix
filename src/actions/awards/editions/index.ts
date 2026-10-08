import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/service/FirebaseSettings";
import { movieKey } from "@/actions/helpers/timelines";

export interface AwardConfig {
  slug: string;
  name: string;
  collectionName: string;
  firstYear: number;
  lastYear: number;
  editionNoun: string;
  filmYearOffset: 0 | 1;
  bestCategoryName: string;
  accentColor: string;
}

// Configuração do Oscar (anos, nome da edição, cor e coleção no Firestore).
// usado em: App
export const OSCAR_CONFIG: AwardConfig = {
  slug: "oscar",
  name: "Oscar",
  collectionName: "oscar",
  firstYear: 1929,
  lastYear: 2026,
  editionNoun: "cerimônia do Oscar",
  filmYearOffset: 1,
  bestCategoryName: "Melhor Filme",
  accentColor: "#d4af37",
};

// Configuração do Globo de Ouro (anos, nome da edição, cor e coleção no Firestore).
// usado em: App
export const GOLDEN_GLOBES_CONFIG: AwardConfig = {
  slug: "globo-de-ouro",
  name: "Globo de Ouro",
  collectionName: "globoDeOuro",
  firstYear: 1944,
  lastYear: 2026,
  editionNoun: "cerimônia do Globo de Ouro",
  filmYearOffset: 1,
  bestCategoryName: "Melhor Filme - Drama",
  accentColor: "#4a7fd6",
};

// Configuração do Festival de Cannes (anos, nome da edição, cor e coleção no Firestore).
// usado em: App
export const CANNES_CONFIG: AwardConfig = {
  slug: "cannes",
  name: "Festival de Cannes",
  collectionName: "cannes",
  firstYear: 1946,
  lastYear: 2026,
  editionNoun: "edição do Festival de Cannes",
  filmYearOffset: 0,
  bestCategoryName: "Palma de Ouro",
  accentColor: "#c81d3f",
};

// Todas as premiações disponíveis.
// usado em: helpers/nav
export const AWARD_CONFIGS: AwardConfig[] = [OSCAR_CONFIG, GOLDEN_GLOBES_CONFIG, CANNES_CONFIG];

export interface AwardNominee {
  filmTitle: string;
  filmYear: number;
  posterPath: string | null;
  isWinner: boolean;
  personName?: string;
  tmdbId: number | null;
  mediaType: "movie" | "tv";
}

export interface AwardCategory {
  name: string;
  nominees: AwardNominee[];
}

export interface AwardEdition {
  ordinal: number;
  ceremonyYear: number;
  filmYear: string;
  headline: string | null;
  categories: AwardCategory[] | null;
}

const ordinalOf = (config: AwardConfig, ceremonyYear: number): number => ceremonyYear - config.firstYear + 1;

// Lista as edições de uma premiação, da mais recente para a mais antiga, ainda sem indicados.
// usado em: awards/dashboard
export const getAwardEditions = (config: AwardConfig): AwardEdition[] => {
  const editions: AwardEdition[] = [];

  for (let year = config.lastYear; year >= config.firstYear; year--) {
    editions.push({
      ordinal: ordinalOf(config, year),
      ceremonyYear: year,
      filmYear: config.filmYearOffset ? String(year - 1) : String(year),
      headline: null,
      categories: null,
    });
  }

  return editions;
};

interface SavedAwardEdition {
  headline: string;
  categories: AwardCategory[];
}

// Lê no Firestore os indicados já salvos de uma edição.
// usado em: awards/dashboard
export const fetchAwardEditionFromFirestore = async (config: AwardConfig, ordinal: number): Promise<SavedAwardEdition | null> => {
  const snap = await getDoc(doc(db, config.collectionName, String(ordinal)));
  if (!snap.exists()) return null;
  const data = snap.data() as SavedAwardEdition;
  return { headline: data.headline, categories: data.categories };
};

// Lê de uma vez todas as edições já resolvidas de uma premiação (a grade mostra o vencedor de cada uma).
// usado em: awards/dashboard
export const fetchAllSavedAwardEditions = async (config: AwardConfig): Promise<Map<number, SavedAwardEdition>> => {
  const snapshot = await getDocs(collection(db, config.collectionName));
  const byOrdinal = new Map<number, SavedAwardEdition>();

  for (const docSnap of snapshot.docs) {
    const ordinal = Number(docSnap.id);
    if (!Number.isFinite(ordinal)) continue;
    const data = docSnap.data() as SavedAwardEdition;
    byOrdinal.set(ordinal, { headline: data.headline, categories: data.categories });
  }

  return byOrdinal;
};

// Chave do indicado (`movie-<id>`; sem id, pelo título) para saber se já foi visto.
// usado em: EditionDetail
export const awardNomineeKey = (nominee: Pick<AwardNominee, "filmTitle" | "filmYear" | "tmdbId" | "mediaType">): string => {
  if (nominee.tmdbId) return movieKey(nominee.mediaType, nominee.tmdbId);

  return `${nominee.filmYear}-${nominee.filmTitle}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

class AwardJsonError extends Error {}

const asAwardNominee = (raw: unknown, path: string): AwardNominee => {
  if (typeof raw !== "object" || raw === null) throw new AwardJsonError(`${path}: esperava um objeto`);
  const item = raw as Record<string, unknown>;

  if (typeof item.filmTitle !== "string" || !item.filmTitle.trim()) throw new AwardJsonError(`${path}.filmTitle: obrigatório (string)`);
  if (typeof item.filmYear !== "number") throw new AwardJsonError(`${path}.filmYear: obrigatório (número)`);
  if (typeof item.isWinner !== "boolean") throw new AwardJsonError(`${path}.isWinner: obrigatório (true/false)`);

  const mediaType = item.mediaType === "tv" ? "tv" : "movie";
  const tmdbId = typeof item.tmdbId === "number" ? item.tmdbId : null;
  const posterPath = typeof item.posterPath === "string" ? item.posterPath : null;

  const nominee: AwardNominee = { filmTitle: item.filmTitle, filmYear: item.filmYear, isWinner: item.isWinner, tmdbId, posterPath, mediaType };
  if (typeof item.personName === "string" && item.personName.trim()) nominee.personName = item.personName.trim();
  return nominee;
};

const asAwardCategory = (raw: unknown, index: number): AwardCategory => {
  if (typeof raw !== "object" || raw === null) throw new AwardJsonError(`categorias[${index}]: esperava um objeto`);
  const item = raw as Record<string, unknown>;

  if (typeof item.name !== "string" || !item.name.trim()) throw new AwardJsonError(`categorias[${index}].name: obrigatório (string)`);
  if (!Array.isArray(item.nominees) || item.nominees.length === 0) {
    throw new AwardJsonError(`categorias[${index}].nominees: obrigatório (array com pelo menos 1 indicado)`);
  }

  const nominees = item.nominees.map((nom, i) => asAwardNominee(nom, `categorias[${index}].nominees[${i}]`));
  return { name: item.name.trim(), nominees };
};

// Valida e converte o JSON colado pelo usuário em categorias e indicados.
// usado em: awards/adddata
export const parseAwardCategoriesJson = (text: string): AwardCategory[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AwardJsonError("JSON inválido — confere se colou o texto certinho, sem faltar vírgula/colchete.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new AwardJsonError("Esperava um array de categorias (ver exemplo) — colou o array inteiro, começando com [ ?");
  }

  return parsed.map((category, index) => asAwardCategory(category, index));
};

// Grava os indicados da edição no Firestore e devolve a manchete (o vencedor de Melhor Filme).
// usado em: awards/adddata
export const saveAwardEditionData = async (config: AwardConfig, ordinal: number, categories: AwardCategory[]): Promise<string> => {
  const bestCategory = categories.find((category) => category.name === config.bestCategoryName);
  const headline = bestCategory?.nominees.find((n) => n.isWinner)?.filmTitle ?? categories[0]?.nominees.find((n) => n.isWinner)?.filmTitle ?? "";

  await setDoc(doc(db, config.collectionName, String(ordinal)), { headline, categories });
  return headline;
};
