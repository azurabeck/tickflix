// src/pages/private/home/dashboard/PosterGridModal.tsx
// Botão "ver todos" de "Últimos vistos" e "Em cartaz" (Figma da Rebecca):
// grade com TODOS os cards, no mesmo estilo compacto da fileira. Reusa o
// visual do modal de "Principais lançamentos" (MajorReleasesModal — mesmo
// overlay/painel/título/fechar, classes `dashboard__major-releases-*`).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { ConnectedMediaCard, cardKey, useMediaCards, useOpenCard } from "@/components/mediaCard";
import { getRecentlyWatched } from "./functions";
import type { MovieRowItem } from "./types";

interface PosterGridModalProps {
  title: string;
  items: MovieRowItem[] | null;
  error?: string | null;
  onOpenItem?: (item: MovieRowItem) => void;
  onClose: () => void;
}

export const PosterGridModal = ({ title, items, error, onOpenItem, onClose }: PosterGridModalProps) => {
  const { t } = useTranslation();
  const open = useOpenCard(items ?? []);

  return (
    <div className="dashboard__major-releases-overlay" onClick={onClose}>
      <div className="dashboard__major-releases-panel dashboard__major-releases-panel--fixed" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dashboard__major-releases-close" onClick={onClose} aria-label={t("close")}>
          <X size={20} />
        </button>
        <h2 className="dashboard__major-releases-title">{title}</h2>

        {items === null && !error && <p className="dashboard__loading">{t("dashboard.loading")}</p>}
        {error && <p className="dashboard__error">{error}</p>}
        {items !== null && items.length === 0 && <p className="dashboard__empty">{t("dashboard.watchedAllEmpty")}</p>}

        <div className="media-grid media-grid--modal media-grid--scroll">
          {(items ?? []).map((item, index) => {
            const id = cardKey(item, index);
            return <ConnectedMediaCard isModal key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} onOpen={onOpenItem} />;
          })}
        </div>
      </div>
    </div>
  );
};

// "Tudo que você viu" — mais recentes primeiro. Busca só quando abre (não
// no mount da Home): são dezenas de chamadas de título no TMDb que quem
// nunca clica em "ver todos" não precisa pagar (o memo de
// `fetchTitleById` ainda reaproveita os 8 já resolvidos da fileira).
const WATCHED_MODAL_LIMIT = 60;

interface RecentlyWatchedModalProps {
  onClose: () => void;
}

export const RecentlyWatchedModal = ({ onClose }: RecentlyWatchedModalProps) => {
  const { t } = useTranslation();
  const media = useMediaCards();
  const [items, setItems] = useState<MovieRowItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!media.uid) return;
    let cancelled = false;
    getRecentlyWatched(media.uid, WATCHED_MODAL_LIMIT)
      .then((movies) => {
        if (!cancelled) setItems(movies);
        media.loadAvailability(movies);
      })
      .catch((err) => {
        console.error("Erro ao buscar tudo que foi visto:", err);
        if (!cancelled) setError(t("dashboard.errors.watchedAll"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <PosterGridModal title={t("dashboard.watchedAllTitle")} items={items} error={error} onClose={onClose} />;
};
