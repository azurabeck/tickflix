// src/pages/private/franchise/functions.ts
// Catálogo GLOBAL de cada franquia — collection própria por franquia
// (`FranchiseConfig.collectionName`), doc único (`FRANCHISE_CATALOG_DOC_ID`
// fixo), compartilhado por TODOS os usuários. Mesma ideia de
// pages/private/awards (`fetchAwardEditionFromFirestore`/
// `saveAwardEditionData`, collection própria por premiação) — pedido
// explícito da Rebecca: "vc seguiu a mesma lógica do oscar?... salvar os
// dados numa collection única e atrelar com os dados os filme para não
// ficar usando a ia toda hora?". Ver franchiseConfigs.ts pro histórico
// completo da decisão.
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/service/FirebaseSettings";
import type { TimelineMovie } from "@/service/TimelineSettings";
import type { FranchiseConfig } from "./franchiseConfigs";

// Cada collection de franquia tem UM doc só (diferente de Oscar, que tem
// um doc por EDIÇÃO — franquia não tem "edições", é uma lista só) — id
// fixo em vez de auto-id, pra sempre saber onde ler/escrever sem
// precisar de query.
const FRANCHISE_CATALOG_DOC_ID = "catalog";

export interface FranchiseCatalog {
  movies: TimelineMovie[];
}

export const fetchFranchiseCatalog = async (config: FranchiseConfig): Promise<FranchiseCatalog | null> => {
  const snap = await getDoc(doc(db, config.collectionName, FRANCHISE_CATALOG_DOC_ID));
  if (!snap.exists()) return null;
  const data = snap.data() as { movies?: TimelineMovie[] };
  return { movies: Array.isArray(data.movies) ? data.movies : [] };
};

// `setDoc` (não `addDoc`) com id fixo — dois usuários resolvendo a MESMA
// franquia ao mesmo tempo (corrida real, mesmo motivo já corrigido pra
// timeline de franquia por usuário, ver service/TimelineSettings.ts
// `createFranchiseTimeline`) escrevem no MESMO documento: pior caso é
// resolver duas vezes à toa, nunca dois catálogos divergentes.
export const saveFranchiseCatalog = async (config: FranchiseConfig, movies: TimelineMovie[]): Promise<void> => {
  await setDoc(doc(db, config.collectionName, FRANCHISE_CATALOG_DOC_ID), { movies, resolvedAt: serverTimestamp() });
};
