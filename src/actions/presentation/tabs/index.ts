import { useEffect, useRef, useState } from "react";
import { CYCLE_IDS, PROBLEM_IDS } from "@/actions/presentation/cycles";

// Uma aba da Apresentação: simples (só o texto) ou com submenu (`items`).
// usado em: PresentationTabs
export interface PresentationTab {
  id: string;
  labelKey: string;
  items?: { id: string; labelKey: string }[];
}

// Abas da Apresentação, na ordem em que aparecem. Cada aba (ou item do submenu) mostra o seu conteúdo no painel.
const PRESENTATION_TABS: PresentationTab[] = [
  { id: "about", labelKey: "presentation.tabs.about" },
  { id: "structure", labelKey: "presentation.tabs.structure" },
  {
    id: "cycle",
    labelKey: "presentation.tabs.cycle",
    items: CYCLE_IDS.map((id) => ({ id, labelKey: `presentation.cycle.${id}` })),
  },
  {
    id: "problems",
    labelKey: "presentation.tabs.problems",
    items: PROBLEM_IDS.map((id) => ({ id, labelKey: `presentation.problems.${id}` })),
  },
];

// Qual aba (e item do submenu, se tiver) está aberta no painel.
// usado em: PresentationTabs, página Apresentação
export interface PresentationSelection {
  tab: string;
  item: string | null;
}

// Estado das abas da Apresentação: a aba escolhida (o painel muda com ela) e o submenu aberto.
// Aba simples escolhe na hora; aba com submenu só abre a lista e a escolha é o item. O submenu fecha ao escolher, ao clicar fora e com Esc.
// usado em: PresentationTabs, private/presentation
export const usePresentationTabs = () => {
  const [selection, setSelection] = useState<PresentationSelection>({ tab: PRESENTATION_TABS[0].id, item: null });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openMenu) return;

    const closeOnClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", closeOnClickOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnClickOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  const selectTab = (tab: PresentationTab) => {
    if (tab.items) {
      setOpenMenu((prev) => (prev === tab.id ? null : tab.id));
      return;
    }
    setSelection({ tab: tab.id, item: null });
    setOpenMenu(null);
  };

  const selectItem = (tab: PresentationTab, itemId: string) => {
    setSelection({ tab: tab.id, item: itemId });
    setOpenMenu(null);
  };

  // Vai direto a uma aba (e item do submenu): usado pelos botões do conteúdo.
  const show = (tabId: string, itemId: string | null = null) => {
    setSelection({ tab: tabId, item: itemId });
    setOpenMenu(null);
  };

  return { tabs: PRESENTATION_TABS, selection, openMenu, rootRef, selectTab, selectItem, show };
};
