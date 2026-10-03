// api/_lib/tmdbServer.ts
// Client TMDb do BACKEND — irmão de src/service/TMDbSettings.ts, não o
// mesmo arquivo. Roda em Node (função serverless da Vercel), não no
// navegador: token lido de `process.env.TMDB_API_KEY` (var de servidor,
// sem prefixo VITE_ — nunca vai pro bundle do client), não de
// `import.meta.env`. Existe pra resolver de vez o problema que motivou
// todo esse backend: antes, CADA navegador de CADA usuário fazia esse
// limitador rodar do zero (uma vez por sessão); agora só esta função
// roda isso, e só quando a lista cacheada (api/_lib/sharedCache.ts)
// expira — a esmagadora maioria das visitas nem chega a chamar o TMDb.
//
// Limitador de concorrência/taxa idêntico ao do client (mesmo raciocínio,
// ver o comentário longo lá): protege UMA execução desta função de
// disparar uma rajada de 40-250 chamadas de uma vez só quando o cache
// expira. NÃO é coordenado entre instâncias serverless diferentes (cada
// cold start da Vercel tem sua própria memória) — aceitável aqui porque
// a maior parte das requisições nem chega a cair nesse caminho (cache
// hit = zero chamada ao TMDb).
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

// `lang` é passado explicitamente por quem chama (não lido de i18n, que
// não existe no servidor) — ver TMDB_LANGUAGE_BY_APP_LANGUAGE em
// src/service/i18n.ts pro mapeamento idioma do site → idioma do TMDb.
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

    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 800));
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
