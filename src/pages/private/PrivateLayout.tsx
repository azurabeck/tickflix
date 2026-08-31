// src/pages/private/PrivateLayout.tsx
// Layout persistente das páginas privadas (Home, Oscar, Timelines) — a
// AppNav é renderizada UMA VEZ aqui, nunca dentro de cada página
// individual, então nunca some quando o usuário troca de página ou um
// dialog abre por cima do conteúdo. Cada página só cuida do próprio
// conteúdo, montado dentro do <Outlet/>.
import { Outlet } from "react-router-dom";
import AppNav from "@/components/appNav";

const PrivateLayout = () => (
  <div className="private-layout">
    <AppNav />
    <Outlet />
  </div>
);

export default PrivateLayout;
