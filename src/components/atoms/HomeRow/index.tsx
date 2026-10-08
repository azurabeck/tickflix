import type { ReactNode } from "react";
import "./style.scss";

interface HomeRowProps {
  children: ReactNode;
  columns?: string;
}

const HomeRow = ({ children, columns }: HomeRowProps) => (
  <div className="home-row" style={columns ? { gridTemplateColumns: columns } : undefined}>
    {children}
  </div>
);

export default HomeRow;
