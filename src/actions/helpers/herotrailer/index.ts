const YOUTUBE_ORIGIN = "https://www.youtube.com";
const CONNECT_RETRY_MS = 400;
const CONNECT_MAX_TRIES = 15;

// Tempo máximo de um trailer antes de passar pro próximo, caso o player não avise que acabou.
// usado em: HeroCarousel
export const HERO_FALLBACK_MAX_MS = 150_000;

// Conversa com o player do YouTube dentro do iframe do trailer.
// usado em: HeroCarousel
export interface HeroChannel {
  send: (func: string, args?: unknown[]) => void;
  close: () => void;
}

// Endereço do player do YouTube do carrossel (autoplay, mudo, sem controles).
// usado em: HeroCarousel
export const buildHeroEmbedSrc = (youtubeKey: string): string => {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    enablejsapi: "1",
    origin: window.location.origin,
  });
  return `${YOUTUBE_ORIGIN}/embed/${youtubeKey}?${params.toString()}`;
};

// Liga o app ao player do iframe (já carregado) usando só mensagens: avisa quando o vídeo acaba ou dá erro e devolve um canal para mandar comandos.
// Sem a biblioteca www-widgetapi do YouTube, que insiste em mandar mensagens para o iframe antes dele responder e enche o console de avisos.
// usado em: HeroCarousel
export const connectHeroPlayer = (
  iframe: HTMLIFrameElement,
  handlers: { onReady: (channel: HeroChannel) => void; onEnded: () => void; onError: () => void }
): HeroChannel => {
  let closed = false;
  let ready = false;
  const post = (message: object) => {
    if (!closed) iframe.contentWindow?.postMessage(JSON.stringify({ ...message, id: 1, channel: "widget" }), YOUTUBE_ORIGIN);
  };
  const channel: HeroChannel = {
    send: (func, args = []) => post({ event: "command", func, args }),
    close: () => {
      closed = true;
      window.clearInterval(retry);
      window.removeEventListener("message", onMessage);
    },
  };

  function onMessage(event: MessageEvent) {
    if (event.source !== iframe.contentWindow || event.origin !== YOUTUBE_ORIGIN || typeof event.data !== "string") return;
    let data: { event?: string; info?: { playerState?: number } | number };
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!ready) {
      ready = true;
      window.clearInterval(retry);
      handlers.onReady(channel);
    }
    const state = data.event === "onStateChange" ? data.info : data.event === "infoDelivery" && typeof data.info === "object" ? data.info.playerState : undefined;
    if (state === 0) handlers.onEnded();
    if (data.event === "onError") handlers.onError();
  }
  window.addEventListener("message", onMessage);

  // o player só atende quando termina de iniciar: repete o aviso de "estou ouvindo" até ele responder
  let tries = 0;
  const retry = window.setInterval(() => {
    tries += 1;
    if (ready || tries > CONNECT_MAX_TRIES) window.clearInterval(retry);
    else post({ event: "listening" });
  }, CONNECT_RETRY_MS);
  post({ event: "listening" });

  return channel;
};

// Liga as legendas do trailer.
// usado em: HeroCarousel
export const enableCaptions = (channel: HeroChannel): void => {
  channel.send("loadModule", ["captions"]);
  channel.send("setOption", ["captions", "track", {}]);
};

// Liga ou desliga o som do trailer.
// usado em: HeroCarousel
export const setPlayerMuted = (channel: HeroChannel | null, muted: boolean): void => {
  channel?.send(muted ? "mute" : "unMute");
};

// Liga ou desliga a legenda do trailer.
// usado em: HeroCarousel
export const setPlayerCaptions = (channel: HeroChannel | null, on: boolean): void => {
  if (!channel) return;
  if (on) enableCaptions(channel);
  else channel.send("unloadModule", ["captions"]);
};
