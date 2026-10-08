import type { ReactNode } from "react";
import "./style.scss";

type ChipVariant = "lilac" | "purple" | "green";

interface ChipProps {
  variant?: ChipVariant;
  children: ReactNode;
}

// Etiqueta arredondada em maiúsculas (ex.: FRONTEND, API). "lilac" = clara, "purple" = roxa, "green" = verde.
const Chip = ({ variant = "lilac", children }: ChipProps) => <span className={`chip chip--${variant}`}>{children}</span>;

export default Chip;
