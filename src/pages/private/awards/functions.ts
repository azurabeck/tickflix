// src/pages/private/awards/functions.ts
// Generalização de pages/private/oscar/functions.ts (código original,
// ver git blame/documents.md pra história completa) pra funcionar com
// qualquer premiação via `AwardConfig` (awardConfigs.ts) — Oscar/Globo de
// Ouro/Cannes usam literalmente as mesmas funções aqui, só passando a
// config diferente.
//
// Dado 100% Firestore, cadastro MANUAL (sem IA) — decisão que já valia
// pro Oscar sozinho (ver awards/documents.md pra história completa: a
// resolução por IA dentro do app foi abandonada por custo real alto,
// R$200+ testando) e continua valendo agora que existem 3 premiações:
// mais IA dentro do app significaria ainda mais custo, não menos.
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/service/FirebaseSettings";
import { movieKey } from "@/service/TimelineSettings";
import type { AwardConfig } from "./awardConfigs";

export interface AwardNominee {
  filmTitle: string;
  filmYear: number;
  posterPath: string | null; // sem resolução TMDb ainda — null vira placeholder
  isWinner: boolean;
  personName?: string; // preenchido só em categoria de pessoa (atriz/ator/diretor)
  // Id real do TMDb — quem cadastra preenche (ver AddDataModal.tsx), null
  // se não souber/não tiver. É o que permite ligar "marcar como visto"
  // aqui com a timeline de verdade do usuário (mesmo formato de
  // TimelineMovie/timelineMovieKey em service/TimelineSettings.ts).
  tmdbId: number | null;
  mediaType: "movie" | "tv";
}

export interface AwardCategory {
  name: string;
  nominees: AwardNominee[]; // vencedor sempre em [0]
}

export interface AwardEdition {
  ordinal: number;
  ceremonyYear: number;
  filmYear: string; // ano dos filmes elegíveis — ver AwardConfig.filmYearOffset
  headline: string | null; // vencedor da categoria principal, decoração do card — null = não cadastrado ainda
  categories: AwardCategory[] | null; // null = indicados dessa edição ainda não cadastrados
}

const ordinalOf = (config: AwardConfig, ceremonyYear: number): number => ceremonyYear - config.firstYear + 1;

// --- Todas as edições (firstYear–lastYear) — só ordinal/ano/faixa de
// filmes, calculado, nunca precisa de dado externo. A lista completa
// existe desde já pra grade de edições nunca parecer incompleta;
// `headline`/`categories` começam sempre null aqui — quem preenche
// (quando já resolvido e salvo) é `fetchAwardEditionFromFirestore`,
// chamado à parte por quem monta a tela (ver index.tsx).
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

// --- Edição cadastrada manualmente, gravada no Firestore (collection
// própria de cada premiação, doc id = ordinal). Ver AddDataModal.tsx pra
// quem grava.
export interface SavedAwardEdition {
  headline: string;
  categories: AwardCategory[];
}

export const fetchAwardEditionFromFirestore = async (config: AwardConfig, ordinal: number): Promise<SavedAwardEdition | null> => {
  const snap = await getDoc(doc(db, config.collectionName, String(ordinal)));
  if (!snap.exists()) return null;
  const data = snap.data() as SavedAwardEdition;
  return { headline: data.headline, categories: data.categories };
};

// Uma leitura só da collection inteira, pra grade de edições já abrir
// mostrando o vencedor de quem já foi resolvido — sem isso o card ficava
// preso em "Indicados em breve" até o usuário clicar naquela edição
// especificamente (bug real relatado pela Rebecca, no Oscar, antes dessa
// generalização).
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

// --- "Já vi esse filme" ------------------------------------------------------
// Mesma chave que timelineMovieKey (service/TimelineSettings.ts), lida/
// escrita pelo mesmo estado global (service/WatchedSettings.ts) — marcar
// um indicado como visto aqui é o MESMO fato de marcá-lo visto em
// qualquer timeline que o contenha, em QUALQUER uma das 3 premiações ou
// fora delas (timeline é só agrupamento, nunca dono do estado).
//
// Só dá pra usar a chave de verdade (`${mediaType}-${tmdbId}`) quando
// quem cadastrou preencheu o tmdbId real — sem isso cai num fallback
// local por título+ano, que não cruza com timeline nenhuma.
export const awardNomineeKey = (nominee: Pick<AwardNominee, "filmTitle" | "filmYear" | "tmdbId" | "mediaType">): string => {
  if (nominee.tmdbId) return movieKey(nominee.mediaType, nominee.tmdbId);

  return `${nominee.filmYear}-${nominee.filmTitle}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acento (normaliza pra comparar/gravar como doc id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

// --- Cadastro manual (AddDataModal.tsx) --------------------------------------
// A Rebecca cola um JSON pronto — só o array de categorias, não o doc
// inteiro; `headline` é calculado aqui a partir do vencedor da categoria
// principal (`AwardConfig.bestCategoryName`). Validação é rasa de
// propósito (só confere a FORMA — tipo de cada campo —, não se o dado é
// correto de verdade; quem cadastra é responsável pelo conteúdo) — campos
// opcionais ausentes (tmdbId/posterPath/mediaType/personName) ganham
// default em vez de dar erro.
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

// Lança AwardJsonError com uma mensagem específica (campo + motivo) se o
// JSON não bater com o formato — quem chama mostra `err.message` direto
// pro usuário, sem precisar abrir o console.
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

export const saveAwardEditionData = async (config: AwardConfig, ordinal: number, categories: AwardCategory[]): Promise<string> => {
  const bestCategory = categories.find((category) => category.name === config.bestCategoryName);
  const headline = bestCategory?.nominees.find((n) => n.isWinner)?.filmTitle ?? categories[0]?.nominees.find((n) => n.isWinner)?.filmTitle ?? "";

  await setDoc(doc(db, config.collectionName, String(ordinal)), { headline, categories });
  return headline;
};
