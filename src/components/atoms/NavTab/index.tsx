import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import "./style.scss";

interface NavTabProps {
  children: ReactNode;
  to?: string;
  active?: boolean;
  onClick?: () => void;
  expanded?: boolean;
}

// Aba da barra de navegação: link (com `to`) ou botão que abre um menu (com `onClick`).
const NavTab = ({ children, to, active, onClick, expanded }: NavTabProps) => {
  if (to) {
    return (
      <NavLink to={to} end className={({ isActive }) => (isActive ? "nav-tab nav-tab--active" : "nav-tab")}>
        {children}
      </NavLink>
    );
  }

  return (
    <button type="button" className={active ? "nav-tab nav-tab--trigger nav-tab--active" : "nav-tab nav-tab--trigger"} onClick={onClick} aria-expanded={expanded} aria-haspopup="menu">
      {children}
    </button>
  );
};

export default NavTab;
