// src/components/userMenu/index.tsx
// Avatar do navbar + menu suspenso da conta — pedido explícito da
// Rebecca: "da uma olhada lá no menu de usuário do projeto mailbook
// [livro-app]... vamos fazer o mesmo aqui no tickflix. inclusive o que
// ta no menu, podemos deixar igualzinho ta lá". Mesma estrutura de lá:
// identidade (nome + e-mail) → Meu perfil → Configurações → Sair (em
// vermelho, separado dos outros dois). Substitui o botão "Sair" solto
// que vivia direto em @/components/appNav.
//
// TickFlix não tem uma store global de auth (ao contrário do
// `useAuthStore` do livro-app) — lê `auth.currentUser` direto, mesmo
// padrão já usado em toda MovieDetail/dashboard/etc. Funciona aqui
// porque este componente só é montado dentro de PrivateLayout, que
// App.tsx já garante só renderizar com um `user` resolvido.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut, RefreshCw, Settings, UserRound } from "lucide-react";
import { auth } from "@/service/FirebaseSettings";
import { ROUTES } from "@/service/Routes";
import { clearPageCache, requestRefresh } from "@/service/PageCache";
import Avatar from "@/components/avatar";
import { handleLogout } from "./functions";
import "./styles.scss";

const UserMenu = () => {
  const { t } = useTranslation();
  const user = auth.currentUser;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const name = user?.displayName || user?.email || t("userMenu.defaultName");

  // Fecha sozinho ao trocar de rota — mesmo cuidado já usado pelos
  // dropdowns da nav (NavDropdown, @/components/appNav).
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSignOut = async () => {
    await handleLogout();
    navigate(ROUTES.AUTH);
  };

  // "Atualizar" — pedido explícito da Rebecca: "poe um botão de atualizar
  // lá no menu do usuário antes de sair". Limpa o cache de 7 dias
  // (@/service/PageCache) do usuário atual e recarrega a página inteira
  // — mais simples e confiável do que tentar avisar cada página montada
  // pra refazer a busca sozinha (o reload já refaz tudo do zero, lendo o
  // cache agora vazio).
  const handleRefresh = () => {
    if (user) clearPageCache(user.uid);
    requestRefresh();
    window.location.reload();
  };

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("userMenu.openAccount")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name} imageUrl={user?.photoURL} />
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__identity">
            <strong>{name}</strong>
            {user?.email && <span>{user.email}</span>}
          </div>

          <Link to={ROUTES.PROFILE} className="user-menu__item" role="menuitem">
            <UserRound size={16} />
            {t("userMenu.profile")}
          </Link>
          <Link to={ROUTES.SETTINGS} className="user-menu__item" role="menuitem">
            <Settings size={16} />
            {t("userMenu.settings")}
          </Link>
          <button type="button" className="user-menu__item" role="menuitem" onClick={handleRefresh}>
            <RefreshCw size={16} />
            {t("userMenu.refresh")}
          </button>
          <button type="button" className="user-menu__item user-menu__item--danger" role="menuitem" onClick={handleSignOut}>
            <LogOut size={16} />
            {t("userMenu.signOut")}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
