import { useTranslation } from "react-i18next";
import type { usePresentationTabs } from "@/actions/presentation/tabs";
import "./style.scss";

interface PresentationTabsProps {
  menu: ReturnType<typeof usePresentationTabs>;
}

// Barra de abas da Apresentação: abas simples e abas com submenu. Só mostra; o estado vem de `usePresentationTabs`.
const PresentationTabs = ({ menu }: PresentationTabsProps) => {
  const { t } = useTranslation();

  return (
    <nav className="presentation-tabs" ref={menu.rootRef} aria-label={t("presentation.title")}>
      {menu.tabs.map((tab) => {
        const active = menu.selection.tab === tab.id;
        const open = menu.openMenu === tab.id;

        return (
          <div key={tab.id} className="presentation-tabs__group">
            <button
              type="button"
              className={active ? "presentation-tabs__tab presentation-tabs__tab--active" : "presentation-tabs__tab"}
              onClick={() => menu.selectTab(tab)}
              aria-current={active && !tab.items ? "page" : undefined}
              aria-haspopup={tab.items ? "menu" : undefined}
              aria-expanded={tab.items ? open : undefined}
            >
              {t(tab.labelKey)}
              {tab.items && <span className={open ? "presentation-tabs__caret presentation-tabs__caret--open" : "presentation-tabs__caret"} aria-hidden="true" />}
            </button>

            {tab.items && open && (
              <div className="presentation-tabs__menu" role="menu">
                {tab.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={active && menu.selection.item === item.id ? "presentation-tabs__item presentation-tabs__item--active" : "presentation-tabs__item"}
                    onClick={() => menu.selectItem(tab, item.id)}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default PresentationTabs;
