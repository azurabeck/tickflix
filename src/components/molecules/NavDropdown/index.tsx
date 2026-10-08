import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import NavTab from "@/components/atoms/NavTab";
import "./style.scss";

export interface NavDropdownItem {
  key: string;
  to: string;
  label: string;
  isActive: boolean;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

// Aba com submenu (Oscar, Franquias, Timelines).
const NavDropdown = ({ label, items, isActive, isOpen, onToggle }: NavDropdownProps) => (
  <div className="nav-dropdown">
    <NavTab active={isActive} onClick={onToggle} expanded={isOpen}>
      {label}
      <ChevronDown size={14} className={isOpen ? "nav-dropdown__chevron nav-dropdown__chevron--open" : "nav-dropdown__chevron"} />
    </NavTab>

    {isOpen && (
      <div className="nav-dropdown__menu" role="menu">
        {items.map((item) => (
          <Link key={item.key} to={item.to} className={item.isActive ? "nav-dropdown__item nav-dropdown__item--active" : "nav-dropdown__item"} role="menuitem">
            {item.label}
          </Link>
        ))}
      </div>
    )}
  </div>
);

export default NavDropdown;
