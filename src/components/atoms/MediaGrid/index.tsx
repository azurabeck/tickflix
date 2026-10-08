import type { ReactNode } from "react";
import "./style.scss";

interface MediaGridProps {
  children: ReactNode;
  variant?: "default" | "modal";
  scroll?: boolean;
}

const MediaGrid = ({ children, variant = "default", scroll = false }: MediaGridProps) => (
  <div className={["media-grid", variant === "modal" && "media-grid--modal", scroll && "media-grid--scroll"].filter(Boolean).join(" ")}>{children}</div>
);

export default MediaGrid;
