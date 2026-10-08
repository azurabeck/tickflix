import type { ReactNode } from "react";
import Spinner from "@/components/atoms/Spinner";
import "./style.scss";

interface StatusMessageProps {
  variant: "loading" | "error" | "empty" | "success";
  children: ReactNode;
  spinner?: boolean;
  compact?: boolean;
}

const StatusMessage = ({ variant, children, spinner = false, compact = false }: StatusMessageProps) => (
  <p className={`status-message status-message--${variant}${compact ? " status-message--compact" : ""}`}>
    {spinner && <Spinner size={18} />}
    {children}
  </p>
);

export default StatusMessage;
