const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const MAX_CONCURRENT_REQUESTS = 6;
const MIN_DISPATCH_GAP_MS = 120;

let activeRequests = 0;
const waitQueue: (() => void)[] = [];
let nextDispatchAt = 0;

const acquireSlot = (): Promise<void> => {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waitQueue.push(resolve));
};

const releaseSlot = (): void => {
  const next = waitQueue.shift();
  if (next) next();
  else activeRequests--;
};

const waitForDispatchGap = async (): Promise<void> => {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextDispatchAt);
  nextDispatchAt = scheduledAt + MIN_DISPATCH_GAP_MS;
  const delay = scheduledAt - now;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
};

const requestTmdb = (url: string): Promise<Response> =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      accept: "application/json",
    },
  });

export const tmdbFetchServer = async <T>(
  path: string,
  params: Record<string, string>,
  lang: string
): Promise<T> => {
  if (!process.env.TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY não configurada nas variáveis de ambiente do servidor.");
  }

  const query = new URLSearchParams({ language: lang, ...params });
  const url = `${TMDB_BASE_URL}${path}?${query.toString()}`;

  await acquireSlot();
  try {
    await waitForDispatchGap();
    let response = await requestTmdb(url);

    // limite do TMDb estourado (429): espera e tenta de novo, até 3 vezes, cada vez esperando mais
    for (let attempt = 1; response.status === 429 && attempt <= 3; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
      response = await requestTmdb(url);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = body?.status_message;
      throw new Error(`TMDb respondeu ${response.status} em ${path}${detail ? `: ${detail}` : ""}`);
    }

    return response.json() as Promise<T>;
  } finally {
    releaseSlot();
  }
};
