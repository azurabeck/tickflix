// src/pages/private/home/dashboard/HomeGroup.tsx
// O GRUPO das seções da Home (montagem pedida pela Rebecca): uma faixa
// full-bleed #F5F5F5 que centraliza o conteúdo (`.dashboard__inner`, máx.
// 1920px com 16px de recuo) e empilha as seções com 16px entre elas — como
// o espaço é o fundo do próprio grupo, a faixa entre as seções fica
// #F5F5F5. `HomeRow` põe várias seções LADO A LADO numa linha do grupo.
//
//   group
//   ├─ seção 1
//   ├─ [ seção 2 | seção 3 | seção 4 ]   ← HomeRow
//   ├─ seção 5
//   └─ seção 6
import type { ReactNode } from "react";

export const HomeGroup = ({ children }: { children: ReactNode }) => (
  <div className="home-group">
    <div className="dashboard__inner home-group__stack">{children}</div>
  </div>
);

// `columns` = `grid-template-columns` da linha (padrão: partes iguais).
export const HomeRow = ({ children, columns }: { children: ReactNode; columns?: string }) => (
  <div className="home-row" style={columns ? { gridTemplateColumns: columns } : undefined}>
    {children}
  </div>
);
