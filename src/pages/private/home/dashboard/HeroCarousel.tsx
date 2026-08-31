// src/pages/private/home/dashboard/HeroCarousel.tsx
// Topo da home: trailer oficial (YouTube, mudo, autoplay) dos campeões de
// bilheteria do ano, um de cada vez. Edge-to-edge de propósito (sem
// .dashboard__inner) — é o elemento que mais aproveita uma tela grande; a
// legenda por cima é que respeita o mesmo recuo lateral do resto do
// conteúdo, pra alinhar com o texto abaixo mesmo sendo full-bleed.
//
// Troca de trailer só quando o vídeo ATUAL termina de verdade (evento
// ENDED da API oficial do YouTube) — não um timer fixo, que cortava
// trailers mais longos no meio pra pular pro próximo (bug relatado pela
// Rebecca). Isso exige a IFrame API do YouTube (só o src do iframe não
// avisa "terminei"); FALLBACK_MAX_MS é só uma rede de segurança pro
// carrossel não travar pra sempre num trailer se o evento nunca disparar
// (autoplay bloqueado, vídeo restrito etc.).
import { useEffect, useRef, useState } from "react";
import { Captions, CaptionsOff, Volume2, VolumeX } from "lucide-react";
import type { HeroTrailer } from "./functions";

interface HeroCarouselProps {
  items: HeroTrailer[];
}

interface YTPlayerInstance {
  destroy: () => void;
  mute: () => void;
  unMute: () => void;
  // Módulo de legenda não é 100% documentado pela API oficial do YouTube
  // (funciona, mas não tem tipo/contrato formal) — daí os opcionais.
  loadModule?: (module: string) => void;
  unloadModule?: (module: string) => void;
  setOption?: (module: string, option: string, value: unknown) => void;
}

interface YTStateChangeEvent {
  data: number;
}

interface YTReadyEvent {
  target: YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          events: {
            onReady: (event: YTReadyEvent) => void;
            onStateChange: (event: YTStateChangeEvent) => void;
            onError: () => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

const loadYouTubeApi = (): Promise<void> => {
  if (window.YT) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });

  return apiLoadPromise;
};

const FALLBACK_MAX_MS = 150_000; // rede de segurança — nenhum trailer oficial passa disso

const HeroCarousel = ({ items }: HeroCarouselProps) => {
  const [index, setIndex] = useState(0);
  // Preferência do usuário — persiste entre trocas de trailer (cada troca
  // recria o iframe/player do zero, sempre mudo por padrão, então
  // reaplicamos essas duas preferências assim que o player novo fica
  // pronto, em vez de resetar a cada slide).
  const [muted, setMuted] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const mutedRef = useRef(muted);
  const captionsOnRef = useRef(captionsOn);
  mutedRef.current = muted;
  captionsOnRef.current = captionsOn;

  const current = items.length > 0 ? items[index % items.length] : null;

  // Trailer dublado não tem faixa de legenda de verdade — sem isso, o
  // botão de legenda ficava visível mas não fazia nada (bug relatado
  // pela Rebecca). Some o botão pra dublados e desliga a preferência ao
  // cair num, já que não tem como o usuário desligar um botão que não
  // está mais na tela.
  useEffect(() => {
    if (current?.isDubbed) setCaptionsOn(false);
  }, [current?.id, current?.isDubbed]);

  useEffect(() => {
    if (!current) return undefined;
    let cancelled = false;

    const advance = () => setIndex((prev) => (prev + 1) % items.length);

    loadYouTubeApi().then(() => {
      if (cancelled || !iframeRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: (event) => {
            const player = event.target;
            if (!mutedRef.current) player.unMute();
            if (captionsOnRef.current && !current.isDubbed) {
              player.loadModule?.("captions");
              player.setOption?.("captions", "track", {});
            }
          },
          onStateChange: (event) => {
            if (window.YT && event.data === window.YT.PlayerState.ENDED) advance();
          },
          // Vídeo restrito/sem permissão de embed etc. — não trava
          // esperando um ENDED que nunca vai vir, já pula pro próximo.
          onError: advance,
        },
      });
    });

    const fallback = setTimeout(advance, FALLBACK_MAX_MS);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // current.id identifica a troca de slide — items.length só muda se a
    // lista em si mudar (não deveria durante o carrossel already montado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const toggleMute = () => {
    const player = playerRef.current;
    setMuted((prev) => {
      const next = !prev;
      try {
        if (player) (next ? player.mute() : player.unMute());
      } catch (err) {
        console.error("Erro ao alternar som do trailer:", err);
      }
      return next;
    });
  };

  const toggleCaptions = () => {
    const player = playerRef.current;
    setCaptionsOn((prev) => {
      const next = !prev;
      try {
        if (player) {
          if (next) {
            player.loadModule?.("captions");
            player.setOption?.("captions", "track", {});
          } else {
            player.unloadModule?.("captions");
          }
        }
      } catch (err) {
        console.error("Erro ao alternar legenda do trailer:", err);
      }
      return next;
    });
  };

  if (!current) return null;

  const embedSrc = `https://www.youtube.com/embed/${current.youtubeKey}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;

  return (
    <div className="dashboard__hero">
      <div className="dashboard__hero-video-wrap">
        <iframe
          key={current.id}
          ref={iframeRef}
          className="dashboard__hero-video"
          src={embedSrc}
          title={`Trailer oficial de ${current.title}`}
          allow="autoplay; encrypted-media"
          frameBorder="0"
        />
        <div className="dashboard__hero-fade" />

        <div className="dashboard__hero-caption dashboard__inner">
          <span className="dashboard__hero-title">{current.title}</span>
          <div className="dashboard__hero-controls">
            <span className="dashboard__hero-badge">EM CARTAZ</span>
            <button
              type="button"
              className="dashboard__hero-icon-btn"
              onClick={toggleMute}
              aria-label={muted ? "Ativar som" : "Silenciar"}
              aria-pressed={!muted}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            {!current.isDubbed && (
              <button
                type="button"
                className="dashboard__hero-icon-btn"
                onClick={toggleCaptions}
                aria-label={captionsOn ? "Desativar legenda" : "Ativar legenda"}
                aria-pressed={captionsOn}
                data-active={captionsOn}
              >
                {captionsOn ? <Captions size={16} /> : <CaptionsOff size={16} />}
              </button>
            )}
          </div>
        </div>

        {items.length > 1 && (
          <div className="dashboard__hero-dots">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={i === index ? "dashboard__hero-dot dashboard__hero-dot--active" : "dashboard__hero-dot"}
                onClick={() => setIndex(i)}
                aria-label={`Ver trailer de ${item.title}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroCarousel;
