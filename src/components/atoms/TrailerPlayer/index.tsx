import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import "./style.scss";

interface TrailerPlayerProps {
  youtubeKey: string;
  title: string;
  onClose: () => void;
}

// Trailer em tela cheia: sair da tela cheia fecha o player.
const TrailerPlayer = ({ youtubeKey, title, onClose }: TrailerPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.requestFullscreen?.().catch(() => {});

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);

  return (
    <div className="trailer-player__overlay" ref={containerRef}>
      <button type="button" className="trailer-player__close" onClick={onClose} aria-label="Fechar trailer">
        <X size={22} />
      </button>
      <iframe
        className="trailer-player__iframe"
        src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`}
        title={`Trailer de ${title}`}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        frameBorder="0"
      />
    </div>
  );
};

export default TrailerPlayer;
