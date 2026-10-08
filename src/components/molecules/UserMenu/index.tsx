import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut, RefreshCw, Settings, UserRound } from "lucide-react";
import { ROUTES } from "@/routes";
import Avatar from "@/components/atoms/Avatar";
import { useUserMenu } from "@/actions/helpers/usermenu";
import "./style.scss";

// Menu do avatar: perfil, configurações, atualizar dados e sair.
const UserMenu = () => {
  const { t } = useTranslation();
  const menu = useUserMenu();

  return (
    <div className="user-menu" ref={menu.rootRef}>
      <button type="button" className="user-menu__trigger" onClick={menu.toggle} aria-label={t("userMenu.openAccount")} aria-haspopup="menu" aria-expanded={menu.open}>
        <Avatar name={menu.name} imageUrl={menu.user?.photoURL} />
        <ChevronDown size={14} />
      </button>

      {menu.open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__identity">
            <strong>{menu.name}</strong>
            {menu.user?.email && <span>{menu.user.email}</span>}
          </div>

          <Link to={ROUTES.PROFILE} className="user-menu__item" role="menuitem">
            <UserRound size={16} />
            {t("userMenu.profile")}
          </Link>
          <Link to={ROUTES.SETTINGS} className="user-menu__item" role="menuitem">
            <Settings size={16} />
            {t("userMenu.settings")}
          </Link>
          <button type="button" className="user-menu__item" role="menuitem" onClick={menu.refresh}>
            <RefreshCw size={16} />
            {t("userMenu.refresh")}
          </button>
          <button type="button" className="user-menu__item user-menu__item--danger" role="menuitem" onClick={menu.logout}>
            <LogOut size={16} />
            {t("userMenu.signOut")}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
