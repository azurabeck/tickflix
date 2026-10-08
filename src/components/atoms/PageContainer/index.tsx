import type { ReactNode } from "react";
import "./style.scss";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

const PageContainer = ({ children, className }: PageContainerProps) => (
  <div className={className ? `page-container ${className}` : "page-container"}>{children}</div>
);

export default PageContainer;
