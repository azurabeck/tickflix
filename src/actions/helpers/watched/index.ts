import { collection, deleteDoc, deleteField, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/service/FirebaseSettings";
import { resolveCardData, type CardData } from "@/actions/helpers/carddata";
import type { MediaItem } from "@/types/media";

const watchedCollection = (uid: string) => collection(db, "users", uid, "watched");

// Menor nota possível.
// usado em: RatingInput
export const MIN_RATING = 1;
// Maior nota possível.
// usado em: RatingInput
export const MAX_RATING = 10;

// De quanto em quanto a nota varia.
// usado em: RatingInput
export const RATING_STEP = 0.5;

// Um título visto ou avaliado pelo usuário. O registro guarda tudo que o card precisa (título, ano, imagens e se dá para assistir),
// então "Últimos vistos", "Seu Rank" e a Sugestão da IA não consultam o TMDb de novo.
export interface WatchedTitle extends CardData {
  key: string; // `movie-<id>` / `tv-<id>`
  id: number;
  mediaType: "movie" | "tv";
  watchedAt?: number; // quando marcou como visto
  rating?: number;
}

// Os campos do card que são gravados junto (os que o card ainda não conhece ficam de fora e são completados depois).
const cardFields = (item: MediaItem) =>
  Object.fromEntries(
    Object.entries({ title: item.title, year: item.year, posterPath: item.posterPath ?? null, backdropPath: item.backdropPath, available: item.available, availableCheckedAt: item.available !== undefined ? Date.now() : undefined, category: item.category }).filter(([, value]) => value !== undefined)
  );

const keyOf = (item: MediaItem): string => `${item.mediaType}-${item.id}`;

// Lê no Firestore tudo que o usuário já viu ou avaliou.
// usado em: profile/statistics, MediaCardsProvider
export const fetchWatched = async (uid: string): Promise<WatchedTitle[]> => {
  const snapshot = await getDocs(watchedCollection(uid));
  return snapshot.docs.flatMap((docSnap): WatchedTitle[] => {
    const [mediaType, idText] = docSnap.id.split("-");
    const id = Number(idText);
    if ((mediaType !== "movie" && mediaType !== "tv") || !Number.isFinite(id)) return [];
    const data = docSnap.data() as Partial<WatchedTitle>;
    return [{ ...data, key: docSnap.id, id, mediaType, title: data.title ?? "", posterPath: data.posterPath ?? null }];
  });
};

// Marca ou desmarca como visto, gravando junto os dados do card.
// usado em: presentation/cyclewatched, MediaCardsProvider
export const saveWatched = (uid: string, item: MediaItem, watched: boolean): Promise<void> => {
  const ref = doc(watchedCollection(uid), keyOf(item));
  return watched ? setDoc(ref, { ...cardFields(item), watchedAt: Date.now() }, { merge: true }) : deleteDoc(ref);
};

// Grava a nota (cria o registro se ainda não existir, como nas séries); sem nota e sem "visto", apaga o registro.
// usado em: presentation/cyclenotes, MediaCardsProvider
export const saveRating = (uid: string, item: MediaItem, rating: number | null, hasWatchedAt: boolean): Promise<void> => {
  const ref = doc(watchedCollection(uid), keyOf(item));
  if (rating !== null) return setDoc(ref, { ...cardFields(item), rating }, { merge: true });
  return hasWatchedAt ? updateDoc(ref, { rating: deleteField() }) : deleteDoc(ref);
};

// Completa em segundo plano os registros que precisam (antigos, ou "indisponíveis" há mais de uma semana): consulta rápida no TMDb
// e já grava no Firebase, para não precisar consultar de novo. Os mais recentes primeiro.
// usado em: MediaCardsProvider
export const completeWatched = async (uid: string, titles: WatchedTitle[]): Promise<WatchedTitle[]> => {
  const byRecency = [...titles].sort((a, b) => Number(b.rating !== undefined) - Number(a.rating !== undefined) || (b.watchedAt ?? 0) - (a.watchedAt ?? 0));
  const resolved = await resolveCardData(byRecency);

  return Promise.all(
    byRecency.flatMap((entry) => {
      const data = resolved.get(entry.key);
      if (!data) return [];
      const completed: WatchedTitle = { ...entry, ...data };
      return [updateDoc(doc(watchedCollection(uid), entry.key), { ...data }).then(() => completed)];
    })
  );
};
