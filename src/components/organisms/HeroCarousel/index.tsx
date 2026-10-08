import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Captions, CaptionsOff, Volume2, VolumeX } from "lucide-react";
import PageContainer from "@/components/atoms/PageContainer";
import Spinner from "@/components/atoms/Spinner";
import {
  HERO_FALLBACK_MAX_MS,
  buildHeroEmbedSrc,
  connectHeroPlayer,
  enableCaptions,
  setPlayerCaptions,
  setPlayerMuted,
  type HeroChannel,
} from "@/actions/helpers/herotrailer";
import type { HeroTrailer } from "@/types/media";
import "./style.scss";

interface HeroCarouselProps {
  items: HeroTrailer[];
  loading?: boolean;
}

// Carrossel de trailers do topo: passa sozinho pro próximo quando o vídeo acaba.
const HeroCarousel = ({ items, loading = false }: HeroCarouselProps) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(false);
  const playerRef = useRef<HeroChannel | null>(null);
  const mutedRef = useRef(muted);
  const captionsOnRef = useRef(captionsOn);
  mutedRef.current = muted;
  captionsOnRef.current = captionsOn;

  const current = items.length > 0 ? items[index % items.length] : null;

  useEffect(() => {
    if (current?.isDubbed) setCaptionsOn(false);
  }, [current?.id, current?.isDubbed]);

  const advance = () => setIndex((prev) => (prev + 1) % items.length);

  // Passa para o próximo se o vídeo não avisar que acabou.
  useEffect(() => {
    if (!current) return undefined;
    const fallback = setTimeout(advance, HERO_FALLBACK_MAX_MS);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Quando o iframe do trailer termina de carregar, liga o app ao player; ao trocar de trailer, fecha a ligação anterior.
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  const connect = (iframe: HTMLIFrameElement, trailer: HeroTrailer) => {
    playerRef.current?.close();
    playerRef.current = connectHeroPlayer(iframe, {
      onReady: (channel) => {
        if (!mutedRef.current) setPlayerMuted(channel, false);
        if (captionsOnRef.current && !trailer.isDubbed) enableCaptions(channel);
      },
      onEnded: () => advanceRef.current(),
      onError: () => advanceRef.current(),
    });
  };
  useEffect(
    () => () => {
      playerRef.current?.close();
      playerRef.current = null;
    },
    [current?.id]
  );

  const toggleMute = () => {
    const next = !muted;
    setPlayerMuted(playerRef.current, next);
    setMuted(next);
  };

  const toggleCaptions = () => {
    const next = !captionsOn;
    setPlayerCaptions(playerRef.current, next);
    setCaptionsOn(next);
  };

  // enquanto os trailers não chegam, a área já ocupa o lugar: tela preta com o carregando no centro
  if (!current) {
    return loading ? (
      <div className="hero-carousel">
        <div className="hero-carousel__video-wrap">
          <Spinner size={40} />
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="hero-carousel">
      <div className="hero-carousel__video-wrap">
        {/* fica atrás do vídeo: aparece enquanto o player do YouTube carrega */}
        <Spinner size={40} />
        <iframe
          key={current.id}
          onLoad={(event) => connect(event.currentTarget, current)}
          className="hero-carousel__video"
          src={buildHeroEmbedSrc(current.youtubeKey)}
          title={t("dashboard.hero.officialTrailer", { title: current.title })}
          allow="autoplay; encrypted-media"
          frameBorder="0"
        />
        <div className="hero-carousel__fade" />

        <PageContainer className="hero-carousel__caption">
          <span className="hero-carousel__title">{current.title}</span>
          <div className="hero-carousel__controls">
            <span className="hero-carousel__badge">{t("dashboard.hero.nowPlayingBadge")}</span>
            <button type="button" className="hero-carousel__icon-btn" onClick={toggleMute} aria-label={muted ? t("dashboard.hero.mute") : t("dashboard.hero.unmute")} aria-pressed={!muted}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            {!current.isDubbed && (
              <button
                type="button"
                className="hero-carousel__icon-btn"
                onClick={toggleCaptions}
                aria-label={captionsOn ? t("dashboard.hero.captionsOn") : t("dashboard.hero.captionsOff")}
                aria-pressed={captionsOn}
                data-active={captionsOn}
              >
                {captionsOn ? <Captions size={16} /> : <CaptionsOff size={16} />}
              </button>
            )}
          </div>
        </PageContainer>

        {items.length > 1 && (
          <div className="hero-carousel__dots">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={i === index ? "hero-carousel__dot hero-carousel__dot--active" : "hero-carousel__dot"}
                onClick={() => setIndex(i)}
                aria-label={t("dashboard.hero.watchTrailer", { title: item.title })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroCarousel;
