import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import "./style.scss";

interface TrailerModalProps {
  title: string;
  youtubeKey: string | null;
  loading: boolean;
  onClose: () => void;
}

const TrailerModal = ({ title, youtubeKey, loading, onClose }: TrailerModalProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="trailer-modal" onClick={onClose}>
      <div className="trailer-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="trailer-modal__close" onClick={onClose} aria-label={t("close")}>
          <X size={20} />
        </button>
        <h2 className="trailer-modal__title">{title}</h2>

        <div className="trailer-modal__frame">
          {loading && <p className="trailer-modal__message">{t("dashboard.loading")}</p>}
          {!loading && !youtubeKey && <p className="trailer-modal__message">{t("card.noTrailer")}</p>}
          {!loading && youtubeKey && (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&playsinline=1`}
              title={t("dashboard.hero.officialTrailer", { title })}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TrailerModal;
