import { useTranslation } from "react-i18next";
import { slugify, type PageDashboard } from "@/actions/helpers/section";
import type { MediaItem } from "@/types/media";

// Section "Em cartaz": pega a fatia "nowplaying" do dashboard (os filmes da cidade, com o loading dela) e monta o título (com a cidade).
// usado em: página Filmes
export const useNowPlaying = (dashboard: PageDashboard) => {
  const { t } = useTranslation();
  const section = dashboard.section<MediaItem>("nowplaying", t("dashboard.errors.nowPlaying"));
  const title = dashboard.city ? t("dashboard.rows.nowPlayingCity", { city: dashboard.city }) : t("dashboard.rows.nowPlayingBrazil");
  return { ...section, title };
};

// Clicar no card aberto leva à página do filme no ingresso.com (usa o link do backend; sem ele, monta pelo título).
// usado em: página Filmes
export const openOnIngresso = (item: MediaItem): void => {
  window.open(item.href ?? `https://www.ingresso.com/filme/${slugify(item.title)}`, "_blank", "noopener,noreferrer");
};
