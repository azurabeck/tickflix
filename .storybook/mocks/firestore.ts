// Firestore em memória para o Storybook: as actions rodam de verdade, só o banco é falso.
import { FOLLOWED_SERIES, MOVIES, TIMELINES } from "../../src/stories/_support/fixtures";

type Data = Record<string, unknown>;
interface Ref {
  path: string;
}
interface Constraint {
  kind: "orderBy" | "limit" | "where";
  field?: string;
  direction?: "asc" | "desc";
  count?: number;
  value?: unknown;
}
interface QueryRef extends Ref {
  constraints: Constraint[];
}

const DELETE = Symbol("deleteField");
const store = new Map<string, Data>();

const seed = () => {
  const now = Date.now();
  // cada registro guarda os dados do card (como o app grava de verdade)
  const watched: [number, number, number | undefined][] = [
    [27205, now - 1000, 9],
    [550, now - 2000, undefined],
    [155, now - 3000, 8],
    [680, now - 4000, undefined],
  ];
  for (const [id, watchedAt, rating] of watched) {
    const movie = MOVIES.find((m) => m.id === id)!;
    store.set(`users/demo/watched/movie-${id}`, { title: movie.title, year: movie.year, posterPath: movie.posterPath, backdropPath: movie.backdropPath ?? null, available: movie.available, watchedAt, ...(rating ? { rating } : {}) });
  }
  for (const timeline of TIMELINES) {
    const { id, ...rest } = timeline;
    store.set(`users/demo/timeline/${id}`, { ...rest });
  }
  store.set(`users/demo/following/${FOLLOWED_SERIES.id}`, { ...FOLLOWED_SERIES });
};
seed();

const clone = <T,>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T));
const join = (parts: unknown[]): string => parts.filter((p): p is string => typeof p === "string").join("/");

export const getFirestore = () => ({});
export const serverTimestamp = () => null;
export const deleteField = () => DELETE;

export const collection = (base: unknown, ...segments: string[]): Ref => ({ path: join([(base as Ref)?.path, ...segments]) });
export const doc = (base: unknown, ...segments: string[]): Ref => ({ path: join([(base as Ref)?.path, ...segments]) });
export const query = (ref: Ref, ...constraints: Constraint[]): QueryRef => ({ path: ref.path, constraints });
export const orderBy = (field: string, direction: "asc" | "desc" = "asc"): Constraint => ({ kind: "orderBy", field, direction });
export const where = (field: string, _op: string, value: unknown): Constraint => ({ kind: "where", field, value });
export const limit = (count: number): Constraint => ({ kind: "limit", count });

const snapshotOf = (path: string, data: Data | undefined) => ({
  id: path.split("/").pop() as string,
  ref: { path },
  exists: () => data !== undefined,
  data: () => clone(data),
});

export const getDoc = async (ref: Ref) => snapshotOf(ref.path, store.get(ref.path));

export const getDocs = async (ref: Ref | QueryRef) => {
  const prefix = ref.path + "/";
  let entries = [...store.entries()].filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"));
  for (const c of (ref as QueryRef).constraints ?? []) {
    if (c.kind === "orderBy" && c.field) {
      const field = c.field;
      const dir = c.direction === "desc" ? -1 : 1;
      entries = [...entries].sort(([, a], [, b]) => {
        const av = (a[field] as number) ?? 0;
        const bv = (b[field] as number) ?? 0;
        return av === bv ? 0 : av > bv ? dir : -dir;
      });
    }
    if (c.kind === "where" && c.field) {
      const field = c.field;
      entries = entries.filter(([, data]) => data[field] === c.value);
    }
    if (c.kind === "limit" && c.count !== undefined) entries = entries.slice(0, c.count);
  }
  const docs = entries.map(([path, data]) => snapshotOf(path, data));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: (d: (typeof docs)[number]) => void) => docs.forEach(fn) };
};

const applyField = (target: Data, dotted: string, value: unknown) => {
  const keys = dotted.split(".");
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    if (typeof cursor[key] !== "object" || cursor[key] === null) cursor[key] = {};
    cursor = cursor[key] as Data;
  }
  const last = keys[keys.length - 1];
  if (value === DELETE) delete cursor[last];
  else cursor[last] = value;
};

export const setDoc = async (ref: Ref, data: Data, options?: { merge?: boolean }) => {
  const next: Data = options?.merge ? clone(store.get(ref.path) ?? {}) : {};
  for (const [field, value] of Object.entries(data)) applyField(next, field, value);
  store.set(ref.path, next);
};

export const updateDoc = async (ref: Ref, data: Data) => {
  const current = store.get(ref.path);
  if (!current) throw new Error("Documento não existe: " + ref.path);
  const next = clone(current);
  for (const [field, value] of Object.entries(data)) applyField(next, field, value);
  store.set(ref.path, next);
};

export const deleteDoc = async (ref: Ref) => {
  store.delete(ref.path);
};

let autoId = 0;
export const addDoc = async (ref: Ref, data: Data): Promise<Ref> => {
  const created = { path: ref.path + "/auto-" + ++autoId };
  await setDoc(created, data);
  return created;
};
