import { useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "@/components/atoms/Logo";
import NavTab from "@/components/atoms/NavTab";
import NavDropdown from "@/components/molecules/NavDropdown";
import UserMenu from "@/components/molecules/UserMenu";
import SearchModal from "@/components/organisms/SearchModal";
import { NAV_LINK_ROUTES, buildNavMenus } from "@/actions/helpers/nav";
import "./style.scss";

// Barra de navegação fixa no topo: abas, submenus, busca e menu da conta.
const AppNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const menus = buildNavMenus(t, location);
  const toggle = (id: string) => () => setOpenDropdown((prev) => (prev === id ? null : id));

  return (
    <nav className="app-nav">
      <div className="app-nav__inner" ref={navRef}>
        <Logo />

        <div className={mobileMenuOpen ? "app-nav__menu app-nav__menu--open" : "app-nav__menu"}>
          <div className="app-nav__tabs">
            {NAV_LINK_ROUTES.map((link) => (
              <NavTab key={link.to} to={link.to}>
                {t(`nav.${link.key}`)}
              </NavTab>
            ))}
            <NavDropdown label={t("nav.oscar")} items={menus.awards} isActive={menus.isAwardsActive} isOpen={openDropdown === "oscar"} onToggle={toggle("oscar")} />
            <NavDropdown label={t("nav.franquias")} items={menus.franchises} isActive={menus.isFranchiseActive} isOpen={openDropdown === "franquias"} onToggle={toggle("franquias")} />
            <NavDropdown label={t("nav.timelines")} items={menus.timelines} isActive={menus.isTimelinesActive} isOpen={openDropdown === "timelines"} onToggle={toggle("timelines")} />
          </div>
        </div>

        <div className="app-nav__actions">
          <button type="button" className="app-nav__search-btn" onClick={() => setSearchOpen(true)} aria-label={t("nav.search")}>
            <Search size={20} />
          </button>

          <UserMenu />

          <button
            type="button"
            className="app-nav__burger"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </nav>
  );
};

export default AppNav;
