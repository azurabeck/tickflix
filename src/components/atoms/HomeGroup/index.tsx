import type { ReactNode } from "react";
import PageContainer from "@/components/atoms/PageContainer";
import "./style.scss";

const HomeGroup = ({ children }: { children: ReactNode }) => (
  <div className="home-group">
    <PageContainer className="home-group__stack">{children}</PageContainer>
  </div>
);

export default HomeGroup;
