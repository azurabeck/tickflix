import type { TFunction } from "i18next";
import type { Location } from "react-router-dom";
import { AWARD_CONFIGS } from "@/actions/awards/editions";
import { FRANCHISE_CONFIGS } from "@/actions/franchises/catalog";
import { ROUTES } from "@/routes";
import type { TimelineCategoryFilter } from "@/actions/helpers/timelines";
import type { NavDropdownItem } from "@/components/molecules/NavDropdown";

// Links fixos da barra (Filmes, Séries, Animes) e a chave da tradução de cada um.
// usado em: AppNav
export const NAV_LINK_ROUTES: { to: string; key: "filmes" | "series" | "animes" }[] = [
  { to: ROUTES.HOME, key: "filmes" },
  { to: ROUTES.SERIES, key: "series" },
  { to: ROUTES.ANIMES, key: "animes" },
];

const TIMELINE_CATEGORY_KEYS: TimelineCategoryFilter[] = ["filmes", "series", "animes", "franquias", "premiacoes"];

// Itens dos três submenus da barra (timelines por categoria, premiações, franquias) e qual está ativo.
// usado em: AppNav
export const buildNavMenus = (t: TFunction, location: Location) => {
  const activeCategory = new URLSearchParams(location.search).get("category");

  const timelines: NavDropdownItem[] = TIMELINE_CATEGORY_KEYS.map((category) => ({
    key: category,
    to: `${ROUTES.TIMELINES}?category=${category}`,
    label: t(`nav.timelineCategory.${category}`),
    isActive: location.pathname === ROUTES.TIMELINES && activeCategory === category,
  }));

  const awards: NavDropdownItem[] = AWARD_CONFIGS.map((config) => {
    const to = config.slug === "oscar" ? ROUTES.OSCAR : config.slug === "globo-de-ouro" ? ROUTES.GOLDEN_GLOBES : ROUTES.CANNES;
    return { key: config.slug, to, label: config.name, isActive: location.pathname === to };
  });

  const franchises: NavDropdownItem[] = FRANCHISE_CONFIGS.map((config) => {
    const to = `${ROUTES.FRANCHISES}/${config.slug}`;
    return { key: config.slug, to, label: config.name, isActive: location.pathname === to };
  });

  return {
    timelines,
    awards,
    franchises,
    isTimelinesActive: timelines.some((item) => item.isActive) || location.pathname === ROUTES.TIMELINES,
    isAwardsActive: awards.some((item) => item.isActive),
    isFranchiseActive: franchises.some((item) => item.isActive),
  };
};
