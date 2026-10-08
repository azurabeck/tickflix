import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/service/FirebaseSettings";

export type ContentType = "filmes" | "series" | "animes";

export type TimelineCategoryFilter = ContentType | "franquias" | "premiacoes";

export interface TimelineMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  posterPath: string | null;
  watched: boolean;
  watchedAt: number | null;
}

// Chave `movie-<id>` / `tv-<id>` usada em vistos, notas e timelines.
export const movieKey = (mediaType: "movie" | "tv", id: number): string => `${mediaType}-${id}`;

// Chave de um título de timeline (mesmo formato de `movieKey`).
// usado em: franchises/dashboard, helpers/timelineai, helpers/timelinedetail, TimelineCard
export const timelineMovieKey = (movie: TimelineMovie): string => movieKey(movie.mediaType, movie.id);

export interface Timeline {
  id: string;
  name: string;
  types: ContentType[];
  movies: TimelineMovie[];
  createdAt: Timestamp | null;
  awardSlug?: string;
  awardEditionOrdinal?: number;
  franchiseSlug?: string;
  followed?: boolean;
}

const timelineCollection = (uid: string) => collection(db, "users", uid, "timeline");

interface CreateTimelineOptions {
  awardSlug?: string;
  awardEditionOrdinal?: number;
  followed?: boolean;
}

// Cria uma timeline do usuário no Firestore.
// usado em: animes/dashboard, awards/timelinesync, helpers/addtotimeline, helpers/createtimeline, series/dashboard, CreateTimelineModal, …
export const createTimeline = async (
  uid: string,
  name: string,
  types: ContentType[],
  movies: TimelineMovie[],
  options: CreateTimelineOptions = {}
): Promise<string> => {
  const { awardSlug, awardEditionOrdinal, followed = false } = options;
  const ref = await addDoc(timelineCollection(uid), {
    name,
    types,
    movies,
    createdAt: serverTimestamp(),
    followed,

    ...(awardSlug && awardEditionOrdinal ? { awardSlug, awardEditionOrdinal } : {}),
  });
  return ref.id;
};

const needsCategoryBackfill = (types: ContentType[] | undefined): boolean => !Array.isArray(types) || types.length === 0;

const legacyOscarOrdinal = (raw: Record<string, unknown>): number | null =>
  typeof raw.oscarEditionOrdinal === "number" && !raw.awardSlug ? raw.oscarEditionOrdinal : null;

// Lê as timelines do usuário (as mais novas primeiro) e corrige formatos antigos.
// usado em: helpers/addtotimeline, helpers/pagefirebase, timelines/mytimelines
export const fetchTimelines = async (uid: string): Promise<Timeline[]> => {
  const snapshot = await getDocs(query(timelineCollection(uid), orderBy("createdAt", "desc")));
  const timelines = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Timeline, "id">) }));
  const rawById = new Map(snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Record<string, unknown>]));

  await Promise.all(
    timelines
      .filter((t) => needsCategoryBackfill(t.types))
      .map((t) =>
        updateDoc(doc(timelineCollection(uid), t.id), { types: ["filmes"] }).catch((err) =>
          console.error(`Erro ao normalizar categoria da timeline ${t.id}:`, err)
        )
      )
  );

  await Promise.all(
    timelines
      .map((t) => ({ t, legacyOrdinal: legacyOscarOrdinal(rawById.get(t.id) ?? {}) }))
      .filter((entry): entry is { t: Timeline; legacyOrdinal: number } => entry.legacyOrdinal !== null)
      .map(({ t, legacyOrdinal }) =>
        updateDoc(doc(timelineCollection(uid), t.id), { awardSlug: "oscar", awardEditionOrdinal: legacyOrdinal }).catch((err) =>
          console.error(`Erro ao migrar oscarEditionOrdinal legado da timeline ${t.id}:`, err)
        )
      )
  );

  return timelines.map((t) => {
    const legacyOrdinal = legacyOscarOrdinal(rawById.get(t.id) ?? {});
    return {
      ...t,
      types: needsCategoryBackfill(t.types) ? (["filmes"] as ContentType[]) : t.types,
      ...(legacyOrdinal !== null ? { awardSlug: "oscar", awardEditionOrdinal: legacyOrdinal } : {}),
    };
  });
};

// Acha a timeline de uma edição de premiação, se já existir.
// usado em: awards/timelinesync
export const fetchTimelineByAwardEdition = async (uid: string, awardSlug: string, awardEditionOrdinal: number): Promise<Timeline | null> => {
  const snapshot = await getDocs(
    query(timelineCollection(uid), where("awardSlug", "==", awardSlug), where("awardEditionOrdinal", "==", awardEditionOrdinal))
  );
  const docSnap = snapshot.docs[0];
  return docSnap ? { id: docSnap.id, ...(docSnap.data() as Omit<Timeline, "id">) } : null;
};

const franchiseTimelineId = (franchiseSlug: string): string => `franchise-${franchiseSlug}`;

// Acha a timeline de uma franquia, se já existir.
// usado em: franchises/dashboard
export const fetchTimelineByFranchise = async (uid: string, franchiseSlug: string): Promise<Timeline | null> => {
  const snap = await getDoc(doc(timelineCollection(uid), franchiseTimelineId(franchiseSlug)));
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Timeline, "id">) } : null;
};

// Cria a timeline de uma franquia (um id fixo por franquia).
// usado em: franchises/dashboard
export const createFranchiseTimeline = async (
  uid: string,
  franchiseSlug: string,
  name: string,
  types: ContentType[],
  movies: TimelineMovie[]
): Promise<string> => {
  const id = franchiseTimelineId(franchiseSlug);
  await setDoc(doc(timelineCollection(uid), id), {
    name,
    types,
    movies,
    createdAt: serverTimestamp(),
    followed: false,
    franchiseSlug,
  });
  return id;
};

// Troca a lista de títulos de uma timeline.
// usado em: awards/timelinesync, helpers/addtotimeline
export const updateTimelineMovies = (uid: string, timelineId: string, movies: TimelineMovie[]): Promise<void> =>
  updateDoc(doc(timelineCollection(uid), timelineId), { movies });

// Marca ou desmarca a timeline como seguida.
// usado em: timelines/mytimelines
export const setTimelineFollowed = (uid: string, timelineId: string, followed: boolean): Promise<void> =>
  updateDoc(doc(timelineCollection(uid), timelineId), { followed });

// Apaga uma timeline.
// usado em: timelines/mytimelines
export const deleteTimeline = (uid: string, timelineId: string): Promise<void> =>
  deleteDoc(doc(timelineCollection(uid), timelineId));

// Quantos títulos da timeline já foram vistos.
// usado em: TimelineCard, FollowedTimelinesRow
export const timelineProgress = (timeline: Timeline, watchedMap: Map<string, number>): { watched: number; total: number } => ({
  watched: timeline.movies.filter((movie) => watchedMap.has(timelineMovieKey(movie))).length,
  total: timeline.movies.length,
});

// Porcentagem (0 a 100) de visto.
// usado em: SeasonItem, TimelineCard, FollowedTimelinesRow, SeriesDetail
export const progressPercent = (watched: number, total: number): number =>
  total === 0 ? 0 : Math.round((watched / total) * 100);
