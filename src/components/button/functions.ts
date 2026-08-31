// src/components/button/functions.ts

export type ButtonVariant = "primary" | "ghost";

export const getButtonClassName = (
  variant: ButtonVariant,
  className: string | undefined
): string => ["btn", `btn--${variant}`, className].filter(Boolean).join(" ");
