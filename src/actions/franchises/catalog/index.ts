import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/service/FirebaseSettings";
import type { TimelineMovie } from "@/actions/helpers/timelines";

export interface FranchiseConfig {
  slug: string;
  name: string;
  collectionName: string;
  query: string;
}

// Franquias disponíveis (nome, coleção no Firestore e a busca usada para montar a lista).
export const FRANCHISE_CONFIGS: FranchiseConfig[] = [
  {
    slug: "marvel",
    name: "Marvel",
    collectionName: "marvel",
    query: "todos os filmes e séries do Universo Cinematográfico Marvel (MCU), da Fase 1 até hoje",
  },
  { slug: "dc", name: "DC", collectionName: "dc", query: "todos os filmes e séries do universo DC (DC Extended Universe e o novo DC Universe)" },
  {
    slug: "mundo-magico",
    name: "Mundo Mágico",
    collectionName: "mundoMagico",
    query: "todos os filmes e séries do universo mágico de Harry Potter, incluindo a saga original e os filmes de Animais Fantásticos",
  },
  {
    slug: "terra-media",
    name: "Terra Média",
    collectionName: "terraMedia",
    query:
      "todos os filmes e séries ambientados na Terra-média criada por J.R.R. Tolkien, incluindo O Senhor dos Anéis, O Hobbit e Os Anéis de Poder",
  },
  {
    slug: "star-wars",
    name: "Star Wars",
    collectionName: "starWars",
    query: "todos os filmes e séries da franquia Star Wars, incluindo as trilogias principais, os spin-offs e as séries do Disney+",
  },
  {
    slug: "jornada-nas-estrelas",
    name: "Jornada nas Estrelas",
    collectionName: "jornadaNasEstrelas",
    query: "todos os filmes e séries da franquia Star Trek (Jornada nas Estrelas), incluindo as séries clássicas e as produções recentes",
  },
  {
    slug: "jurassic-park",
    name: "Jurassic Park",
    collectionName: "jurassicPark",
    query: "todos os filmes e séries da franquia Jurassic Park / Jurassic World",
  },
  {
    slug: "percy-jackson",
    name: "Percy Jackson",
    collectionName: "percyJackson",
    query: "todos os filmes e séries baseados nos livros de Percy Jackson, de Rick Riordan",
  },
  { slug: "james-bond", name: "James Bond", collectionName: "jamesBond", query: "todos os filmes da franquia James Bond (007)" },
];

// Acha a franquia pelo slug da URL.
// usado em: página Franquias
export const findFranchiseConfig = (slug: string | undefined): FranchiseConfig | null =>
  FRANCHISE_CONFIGS.find((config) => config.slug === slug) ?? null;

const FRANCHISE_CATALOG_DOC_ID = "catalog";

interface FranchiseCatalog {
  movies: TimelineMovie[];
}

// Lê no Firestore a lista de títulos da franquia, compartilhada entre todos os usuários.
// usado em: franchises/dashboard
export const fetchFranchiseCatalog = async (config: FranchiseConfig): Promise<FranchiseCatalog | null> => {
  const snap = await getDoc(doc(db, config.collectionName, FRANCHISE_CATALOG_DOC_ID));
  if (!snap.exists()) return null;
  const data = snap.data() as { movies?: TimelineMovie[] };
  return { movies: Array.isArray(data.movies) ? data.movies : [] };
};

// Grava a lista da franquia (quem abre primeiro monta; os outros reaproveitam).
// usado em: franchises/dashboard
export const saveFranchiseCatalog = async (config: FranchiseConfig, movies: TimelineMovie[]): Promise<void> => {
  await setDoc(doc(db, config.collectionName, FRANCHISE_CATALOG_DOC_ID), { movies, resolvedAt: serverTimestamp() });
};
