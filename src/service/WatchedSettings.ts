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
import { collection, deleteDoc, doc, getDocs, limit as fsLimit, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "./FirebaseSettings";

const watchedCollection = (uid: string) => collection(db, "users", uid, "watched");

export const fetchWatchedMap = async (uid: string): Promise<Map<string, number>> => {
  const snapshot = await getDocs(watchedCollection(uid));
  return new Map(snapshot.docs.map((docSnap) => [docSnap.id, (docSnap.data() as { watchedAt: number }).watchedAt]));
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
