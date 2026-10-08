import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import StatusMessage from "@/components/atoms/StatusMessage";
import "./style.scss";

interface HomeSectionProps {
  title?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  toolbar?: ReactNode;
  variant?: "default" | "purple";
  wide?: boolean;
  gapAfter?: boolean;
  className?: string;
  children: ReactNode;
}

const HomeSection = ({ title, actions, loading, error, toolbar, variant = "default", wide, gapAfter, className, children }: HomeSectionProps) => {
  const { t } = useTranslation();
  const classes = ["home-section", variant === "purple" && "home-section--purple", wide && "home-section--wide", gapAfter && "home-section--gap-after", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      {(title || actions) && (
        <div className="home-section__header">
          {title && <h2 className="home-section__title">{title}</h2>}
          {actions}
        </div>
      )}
      {toolbar}
      {loading && <StatusMessage variant="loading">{t("dashboard.loading")}</StatusMessage>}
      {error && <StatusMessage variant="error">{error}</StatusMessage>}
      {!loading && !error && children}
    </section>
  );
};

export default HomeSection;
