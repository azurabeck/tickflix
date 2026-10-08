import type { CSSProperties, ReactNode } from "react";
import "./style.scss";

interface PageShellProps {
  variant?: "light" | "dark";
  width?: "default" | "narrow";
  title?: ReactNode;
  subtitle?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
}

// Casca das páginas internas: fundo, largura máxima e título. "light" = Perfil/Configurações; "dark" = Premiações/Franquias.
const PageShell = ({ variant = "light", width = "default", title, subtitle, style, children }: PageShellProps) => (
  <div className={`page-shell page-shell--${variant}`} style={style}>
    <div className={width === "narrow" ? "page-shell__inner page-shell__inner--narrow" : "page-shell__inner"}>
      {title && <h1 className="page-shell__title">{title}</h1>}
      {subtitle && <p className="page-shell__subtitle">{subtitle}</p>}
      {children}
    </div>
  </div>
);

export default PageShell;
