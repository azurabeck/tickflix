// src/pages/private/PrivateLayout.tsx
// Layout persistente das páginas privadas (Home, Oscar, Timelines) — a
// AppNav é renderizada UMA VEZ aqui, nunca dentro de cada página
// individual, então nunca some quando o usuário troca de página ou um
// dialog abre por cima do conteúdo. Cada página só cuida do próprio
// conteúdo, montado dentro do <Outlet/>.
//
// O MediaCardsProvider também vive aqui: o estado dos cards de
// filme/série/anime (assistidos, notas, seguidos) e os modais que eles
// abrem (trailer, detalhe) são globais — carregam uma vez só, não a cada
// página.
import { Outlet } from "react-router-dom";
import AppNav from "@/components/appNav";
import { MediaCardsProvider } from "@/components/mediaCard";

const PrivateLayout = () => (
  <div className="private-layout">
    <MediaCardsProvider>
      <AppNav />
      <Outlet />
    </MediaCardsProvider>
  </div>
);

export default PrivateLayout;

