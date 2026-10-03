// src/service/WatchedSettings.ts
// "Já vi esse filme" é um fato sobre o FILME, não sobre a timeline que
// ele está dentro — pedido explícito da Rebecca: "a timeline é um
// agrupamento, o usuário tem que poder marcar um filme como visto,
// independente dele estar dentro de uma timeline ou não" / "se eu marco
// o filme em 1 das timelines, na outra tb deve aparecer marcado".
//
// UMA fonte de verdade por usuário: users/{uid}/watched/{chave}, chave =
// mesmo formato de `timelineMovieKey` (service/TimelineSettings.ts):
// `${mediaType}-${id}` do TMDb. Cada doc só guarda `watchedAt` — nada de
// título/pôster duplicado aqui (isso é responsabilidade do TMDb, não
// nossa; guardar de novo só criava inconsistência entre docs antigos e
// novos). "Últimos vistos" (getRecentlyWatched, home/dashboard/functions.ts)
// lê essa collection ordenada por `watchedAt` direto — pedido explícito
// dela: "a lista de últimos vistos deve ser pelo user -> watched ->
// watched_at" — e resolve título/pôster no TMDb pela chave (que já tem
// o id) na hora de montar a fileira, não precisa desse dado salvo aqui.
//
// `TimelineMovie.watched`/`watchedAt` continuam existindo no tipo (não
// vale a pena migrar os docs antigos) mas NINGUÉM mais lê/escreve
// através deles — sempre passa por aqui.
import { collection, deleteDoc, deleteField, doc, getDocs, limit as fsLimit, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./FirebaseSettings";

const watchedCollection = (uid: string) => collection(db, "users", uid, "watched");

interface WatchedDoc {
  watchedAt?: number;
  rating?: number;
}

// Nota do usuário (1 a 10, de meio em meio ponto) — mora no MESMO doc do "já vi" (`rating` ao
// lado de `watchedAt`), não numa collection nova: só faz sentido nota de
// título que já foi visto, e desmarcar "já vi" (deleteDoc) leva a nota
// junto, sem ficar dado órfão. Pedido da Rebecca: "precisamos passar a
// gravar a nota do usuário" (alimenta "Seu Rank" e a sugestão da IA).
export const MIN_RATING = 1;
export const MAX_RATING = 10;
// Passo da nota: meio ponto (ex.: 8,5), como no card do Figma.
export const RATING_STEP = 0.5;

// UMA leitura da collection devolve os dois mapas (chave → watchedAt, chave
// → nota) — a Home precisa dos dois, não vale ler duas vezes.
export const fetchWatchedWithRatings = async (uid: string): Promise<{ watchedMap: Map<string, number>; ratings: Map<string, number> }> => {
  const snapshot = await getDocs(watchedCollection(uid));
  const watchedMap = new Map<string, number>();
  const ratings = new Map<string, number>();
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as WatchedDoc;
    // Série avaliada sem ter sido "vista" tem doc só com `rating`.
    if (typeof data.watchedAt === "number") watchedMap.set(docSnap.id, data.watchedAt);
    if (typeof data.rating === "number") ratings.set(docSnap.id, data.rating);
  }
  return { watchedMap, ratings };
};

export const fetchWatchedMap = async (uid: string): Promise<Map<string, number>> => (await fetchWatchedWithRatings(uid)).watchedMap;

// `updateDoc` (não setDoc+merge) de propósito: só atualiza doc que JÁ
// existe, ou seja, só título já marcado como visto — um setDoc com merge
// criaria um doc sem `watchedAt`, que quebraria "Últimos vistos".
export const setRating = (uid: string, key: string, rating: number | null): Promise<void> =>
  updateDoc(doc(watchedCollection(uid), key), { rating: rating === null ? deleteField() : rating });

// Nota de SÉRIE: pode ser dada a qualquer momento, sem a série estar "vista"
// (o check dela é "estou assistindo", não "assisti") — por isso cria o doc
// só com `rating` quando precisa. Sem `watchedAt` o doc não entra no
// orderBy de "Últimos vistos". Tirar a nota apaga o doc se ele só existia
// por causa dela.
export const setSeriesRating = (uid: string, key: string, rating: number | null, hasWatchedAt: boolean): Promise<void> => {
  const ref = doc(watchedCollection(uid), key);
  if (rating !== null) return setDoc(ref, { rating }, { merge: true });
  return hasWatchedAt ? updateDoc(ref, { rating: deleteField() }) : deleteDoc(ref);
};

export const setWatched = (uid: string, key: string, watched: boolean): Promise<void> => {
  const ref = doc(watchedCollection(uid), key);
  return watched ? setDoc(ref, { watchedAt: Date.now() }) : deleteDoc(ref);
};

export interface RecentlyWatchedKey {
  key: string; // `${mediaType}-${id}` — quem chama extrai mediaType/id daqui
  watchedAt: number;
}

// Query de verdade no Firestore (orderBy + limit), não um fetch de tudo
// + sort no client — "users -> watched -> watched_at" direto. Quem
// chama resolve título/pôster (TMDb, pela chave) depois.
export const fetchRecentlyWatchedKeys = async (uid: string, limit: number): Promise<RecentlyWatchedKey[]> => {
  const snapshot = await getDocs(query(watchedCollection(uid), orderBy("watchedAt", "desc"), fsLimit(limit)));
  return snapshot.docs.map((docSnap) => ({ key: docSnap.id, watchedAt: (docSnap.data() as { watchedAt: number }).watchedAt }));
};
