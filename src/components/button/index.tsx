// src/components/button/index.tsx
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { getButtonClassName, type ButtonVariant } from "./functions";
import "./styles.scss";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const Button = ({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) => (
  <button className={getButtonClassName(variant, className)} disabled={disabled || loading} {...rest}>
    {loading && <Loader2 className="btn__spinner" size={16} />}
    {children}
  </button>
);

export default Button;
