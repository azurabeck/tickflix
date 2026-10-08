import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { auth } from "@/service/FirebaseSettings";
import { ROUTES } from "@/routes";
import { clearPageCache, requestRefresh } from "@/actions/helpers/pagecache";

// Menu do avatar: abrir/fechar (fecha ao clicar fora, com Esc e ao trocar de página), atualizar os dados e sair.
// usado no AppNav.
export const useUserMenu = () => {
  const { t } = useTranslation();
  const user = auth.currentUser;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const closeOnClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnClickOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnClickOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const logout = async () => {
    await signOut(auth);
    navigate(ROUTES.AUTH);
  };

  // Apaga o cache local e pede para todas as páginas buscarem tudo de novo.
  const refresh = () => {
    if (user) clearPageCache(user.uid);
    requestRefresh();
    window.location.reload();
  };

  return {
    user,
    name: user?.displayName || user?.email || t("userMenu.defaultName"),
    open,
    toggle: () => setOpen((prev) => !prev),
    rootRef,
    logout,
    refresh,
  };
};
