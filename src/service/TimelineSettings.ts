// src/service/TimelineSettings.ts
// Timelines salvas pelo usuário — collection users/{uid}/timeline.
// `createTimeline` grava (painel "Criar uma nova timeline"), a home lê
// (grade "Minhas timelines"). Fica em service/ porque é compartilhado
// entre partes diferentes da home, não pertence só a uma.
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
import { db } from "./FirebaseSettings";

// Tipo de conteúdo — usado pras abas "Filmes/Séries/Animes" que filtram a
// grade de timelines na home.
export type ContentType = "filmes" | "series" | "animes";

// Categoria de FILTRO da página Timelines (dropdown "Timelines" da nav) —
// as 3 de `ContentType` mais "franquias" e "premiacoes". Nenhuma das duas
// é um `ContentType` de verdade (nunca gravado em `Timeline.types`) — são
// só o RÓTULO de um filtro que junta timelines por uma característica
// diferente de "tipo de mídia":
// - "franquias" — pedido explícito da Rebecca: "essas timelines que
//   misturam series e filmes ou seja que tem mais de 1 categoria não deve
//   cair na categoria outros.. vamos criar a categoria no menu timeline".
//   Timeline de franquia (`Timeline.franchiseSlug`, ver
//   pages/private/franchise) é o único caso com `types.length > 1`
//   (`["filmes", "series"]`) — ganha a PRÓPRIA aba em vez de cair
//   implicitamente nas abas Filmes/Séries (as duas ao mesmo tempo, via
//   `.includes`).
// - "premiacoes" — pedido explícito da Rebecca: "pode ter a categoria
//   premiações tb ali... que vai recever as timelines do oscar, globo de
//   ouro e vestival de canes". Timeline de premiação
//   (`Timeline.awardSlug`, ver pages/private/awards/timelineSync.ts) tem
//   `types: ["filmes"]` fixo (por isso cairia na aba Filmes sem essa
//   categoria própria) — junta as 3 premiações (Oscar/Globo de Ouro/
//   Cannes) numa aba só, tirando elas da aba Filmes.
export type TimelineCategoryFilter = ContentType | "franquias" | "premiacoes";

export interface StepOneOption {
  value: ContentType;
  label: string;
}

export const STEP_ONE_OPTIONS: StepOneOption[] = [
  { value: "filmes", label: "Filmes" },
  { value: "series", label: "Séries" },
  { value: "animes", label: "Animes" },
];

export interface TimelineMovie {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  posterPath: string | null;
  watched: boolean;
  // Date.now() de quando foi marcado — usado pra "Últimos vistos" na home.
  // null (não undefined — Firestore rejeita undefined em campo de array
  // de objetos) quando nunca foi marcado ou foi desmarcado.
  watchedAt: number | null;
}

// Chave única de um título do TMDb (ids podem colidir entre movie/tv) —
// mesma chave usada pelo estado global de "já vi"
// (service/WatchedSettings.ts) e por oscarNomineeKey
// (pages/private/oscar/functions.ts). Recebe só id+mediaType (não o
// TimelineMovie inteiro) pra dar pra usar em qualquer card de filme do
// app que só tenha esses dois campos (fileira de pôster, resultado de
// busca), não só filme já dentro de uma timeline.
export const movieKey = (mediaType: "movie" | "tv", id: number): string => `${mediaType}-${id}`;

export const timelineMovieKey = (movie: TimelineMovie): string => movieKey(movie.mediaType, movie.id);

export interface Timeline {
  id: string;
  name: string;
  types: ContentType[];
  movies: TimelineMovie[];
  createdAt: Timestamp | null;
  // Presente só nas timelines auto-criadas a partir de uma edição de
  // premiação (Oscar/Globo de Ouro/Cannes — ver pages/private/awards/
  // timelineSync.ts) — junto, ligam a timeline de volta à edição, pra
  // achar "já existe uma timeline pra essa edição desse prêmio?" sem
  // depender de comparar nome (string), que pode mudar. `awardSlug`
  // separa as premiações entre si (a edição 81 do Oscar e a edição 81 do
  // Globo de Ouro não podem colidir). Generalizado a partir do campo
  // `oscarEditionOrdinal` que só existia pro Oscar (renomeado quando o
  // Globo de Ouro/Cannes entraram — dado antigo de teste com o campo
  // velho simplesmente não casa mais com essa busca, sem problema, é só
  // a Rebecca testando sozinha ainda).
  awardSlug?: string;
  awardEditionOrdinal?: number;
  // Presente só nas timelines auto-criadas pelas páginas de Franquia
  // (ver pages/private/franchise) — liga a timeline de volta ao slug da
  // franquia, pra achar "já existe uma timeline pra essa franquia?" sem
  // criar duplicata a cada visita.
  franchiseSlug?: string;
  // "Seguindo" — pedido explícito da Rebecca: ícone no card pra marcar
  // que essa timeline deve aparecer também na Home. Ausente/false =
  // não segue. Sempre lido com `?? false` (nunca undefined puro em
  // comparação), timelines antigas não têm esse campo gravado ainda.
  followed?: boolean;
}

const timelineCollection = (uid: string) => collection(db, "users", uid, "timeline");

export interface CreateTimelineOptions {
  awardSlug?: string;
  awardEditionOrdinal?: number;
  // "Seguindo" — default false. Só a criação "de verdade" (painel "Criar
  // uma nova timeline") passa `true` explícito (pedido da Rebecca: "quando
  // adicionar uma timeline nova já adiciona ela como favorita", pra
  // aparecer direto na Home). As timelines auto-criadas (premiação,
  // franquia) não passam isso — continuam não-seguidas por padrão, são
  // efeito colateral de outra ação, não uma criação deliberada.
  followed?: boolean;
}

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
    // Firestore rejeita valor `undefined` em campo — só entra quando o
    // dado correspondente existe de verdade.
    ...(awardSlug && awardEditionOrdinal ? { awardSlug, awardEditionOrdinal } : {}),
  });
  return ref.id;
};

// SÓ timeline sem `types` NENHUM (doc de antes dessa categorização
// existir) precisa de backfill — não confundir com "types diferente de
// ['filmes']", que era o critério da PRIMEIRA versão desse backfill e
// tinha um bug real: forçava QUALQUER timeline de volta pra ['filmes']
// incondicionalmente, o que quebraria uma timeline de série de verdade
// (criada pelo painel "series" da página Séries, `types: ["series"]`) —
// ela voltaria pra "filmes" sozinha no PRÓXIMO fetch, silenciosamente.
// Agora só doc realmente sem categoria (legado) é tocado; timeline com
// `types` já preenchido — seja `["filmes"]` ou `["series"]` — nunca mais
// é reescrita aqui.
const needsCategoryBackfill = (types: ContentType[] | undefined): boolean => !Array.isArray(types) || types.length === 0;

// Backfill do campo LEGADO `oscarEditionOrdinal` (só ordinal, sem
// `awardSlug` — nome do campo de quando só existia o Oscar, antes do
// Globo de Ouro/Cannes) pro par novo `awardSlug`+`awardEditionOrdinal`
// (ver `syncAwardTimeline`, pages/private/awards/timelineSync.ts). Sem
// isso, uma timeline "98ª Cerimônia do Oscar" criada ANTES da
// generalização das premiações ficava presa na aba "Filmes" da página
// Timelines pra sempre — pedido explícito da Rebecca: "pode ter a
// categoria premiações tb ali... que vai recever as timelines do oscar,
// globo de ouro e vestival de canes" só faz sentido se as timelines de
// Oscar JÁ EXISTENTES também entrarem lá, não só as criadas dali pra
// frente. `oscarEditionOrdinal` não está no tipo `Timeline` (campo
// morto, só existe em docs antigos) — por isso o cast pra `Record<string,
// unknown>` aqui, só nesse backfill.
const legacyOscarOrdinal = (raw: Record<string, unknown>): number | null =>
  typeof raw.oscarEditionOrdinal === "number" && !raw.awardSlug ? raw.oscarEditionOrdinal : null;

export const fetchTimelines = async (uid: string): Promise<Timeline[]> => {
  const snapshot = await getDocs(query(timelineCollection(uid), orderBy("createdAt", "desc")));
  const timelines = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Timeline, "id">) }));
  const rawById = new Map(snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Record<string, unknown>]));

  // Backfill de categoria — pedido explícito da Rebecca: "aquelas que
  // estão lá adicionadas agora são da categoria filmes" (timeline
  // legada, sem `types` nenhum, é tratada como "filmes" — era o único
  // tipo que existia antes da categorização ter sentido de verdade).
  // Self-healing na leitura, não um script de migration à parte;
  // idempotente (já corrigida, não escreve de novo na próxima leitura).
  await Promise.all(
    timelines
      .filter((t) => needsCategoryBackfill(t.types))
      .map((t) =>
        updateDoc(doc(timelineCollection(uid), t.id), { types: ["filmes"] }).catch((err) =>
          console.error(`Erro ao normalizar categoria da timeline ${t.id}:`, err)
        )
      )
  );

  // Backfill de `oscarEditionOrdinal` legado — ver comentário de
  // `legacyOscarOrdinal` acima. Também self-healing/idempotente (uma vez
  // migrado, `awardSlug` já presente, não entra mais nesse filtro).
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

// Usado pelas páginas de premiação (Oscar/Globo de Ouro/Cannes) pra saber
// se já existe uma timeline pra essa edição desse prêmio antes de criar
// outra — marcar "já vi" em mais de um filme da mesma edição deve
// atualizar a MESMA timeline, não criar uma nova a cada clique. Duas
// igualdades (`awardSlug` + `awardEditionOrdinal`) não precisam de índice
// composto no Firestore.
export const fetchTimelineByAwardEdition = async (uid: string, awardSlug: string, awardEditionOrdinal: number): Promise<Timeline | null> => {
  const snapshot = await getDocs(
    query(timelineCollection(uid), where("awardSlug", "==", awardSlug), where("awardEditionOrdinal", "==", awardEditionOrdinal))
  );
  const docSnap = snapshot.docs[0];
  return docSnap ? { id: docSnap.id, ...(docSnap.data() as Omit<Timeline, "id">) } : null;
};

// Timeline de franquia usa um ID DETERMINÍSTICO (`franchise-{slug}`), não
// o auto-id de `addDoc` — de propósito, pra fechar uma corrida real: a
// página de Franquia resolve (IA+TMDb, ~10s+) e cria na PRIMEIRA visita
// (ver pages/private/franchise/index.tsx); com um "buscar por query, se
// não achar, criar" comum (auto-id), dois efeitos concorrentes (React
// StrictMode no dev already double-invoca o efeito; duas abas na mesma
// franquia antes da 1ª terminar de resolver, em produção) buscam ANTES
// de qualquer um ter gravado, os dois acham "não existe" e os dois
// criam — vira timeline DUPLICADA de verdade (bug visto ao vivo testando
// essa página: 2 cards "Percy Jackson" na grade de Timelines). Com ID
// determinístico, os dois `setDoc` concorrentes escrevem no MESMO
// documento — o pior caso é resolver duas vezes à toa (custo de IA
// desperdiçado), nunca dois documentos.
const franchiseTimelineId = (franchiseSlug: string): string => `franchise-${franchiseSlug}`;

export const fetchTimelineByFranchise = async (uid: string, franchiseSlug: string): Promise<Timeline | null> => {
  const snap = await getDoc(doc(timelineCollection(uid), franchiseTimelineId(franchiseSlug)));
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Timeline, "id">) } : null;
};

// Cria (ou sobrescreve, no raro caso de corrida acima) a timeline de uma
// franquia com ID determinístico — ver comentário de
// `fetchTimelineByFranchise`. Não usa `createTimeline` (que sempre grava
// com auto-id via `addDoc`) por isso.
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

export const updateTimelineMovies = (uid: string, timelineId: string, movies: TimelineMovie[]): Promise<void> =>
  updateDoc(doc(timelineCollection(uid), timelineId), { movies });

// Botão de estrela no card (Timelines) — timeline seguida aparece
// também na Home ("Timelines que você segue").
export const setTimelineFollowed = (uid: string, timelineId: string, followed: boolean): Promise<void> =>
  updateDoc(doc(timelineCollection(uid), timelineId), { followed });

// Apaga a timeline inteira — ação destrutiva e irreversível, quem chama
// (botão de lixeira no card) já pede confirmação antes.
export const deleteTimeline = (uid: string, timelineId: string): Promise<void> =>
  deleteDoc(doc(timelineCollection(uid), timelineId));

// `watchedMap` é o estado GLOBAL de "já vi" (service/WatchedSettings.ts)
// — não lê mais `movie.watched` (esse campo fica só no doc por
// compatibilidade, não é mais a fonte de verdade; ver comentário lá).
export const timelineProgress = (timeline: Timeline, watchedMap: Map<string, number>): { watched: number; total: number } => ({
  watched: timeline.movies.filter((movie) => watchedMap.has(timelineMovieKey(movie))).length,
  total: timeline.movies.length,
});

// Usado tanto pela grade de timelines (barra de progresso do card) quanto
// pelo TimelineDetail (dialog) — mora aqui, não em functions.ts de uma
// página específica, porque é matemática genérica sobre Timeline.
export const progressPercent = (watched: number, total: number): number =>
  total === 0 ? 0 : Math.round((watched / total) * 100);
