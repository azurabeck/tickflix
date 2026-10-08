import { useTranslation } from "react-i18next";
import { Ticket, Info, Loader2 } from "lucide-react";
import Button from "@/components/atoms/Button";
import LanguageSwitcher from "@/components/atoms/LanguageSwitcher";
import { useAuthPage } from "@/actions/auth/form";
import "./style.scss";

const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.5 0 10.4-2.1 14.2-5.5l-6.6-5.6C29.5 34.6 26.9 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.8 39.6 16.4 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C41.4 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"
    />
  </svg>
);

// Os campos de cada modo (login ou criar conta).
const fieldsOf = (mode: "login" | "signup", t: (key: string) => string) =>
  mode === "login"
    ? [
        { name: "email", type: "text", placeholder: t("auth.usernamePlaceholder"), autoComplete: "username" },
        { name: "password", type: "password", placeholder: t("auth.passwordPlaceholder"), autoComplete: "current-password" },
      ]
    : [
        { name: "email", type: "email", placeholder: t("auth.emailPlaceholder"), autoComplete: "email" },
        { name: "password", type: "password", placeholder: t("auth.createPasswordPlaceholder"), autoComplete: "new-password" },
        { name: "confirm", type: "password", placeholder: t("auth.confirmPasswordPlaceholder"), autoComplete: "new-password" },
      ];

const Auth = () => {
  const { t } = useTranslation();
  const auth = useAuthPage();
  const { mode, highlight } = auth;
  const isLogin = mode === "login";

  return (
    <div className="auth-page">
      <div className="auth-page__bg" style={highlight ? { backgroundImage: `url(${highlight.image_url})` } : undefined} />
      <div className="auth-page__overlay" />

      <div className="auth-page__language">
        <LanguageSwitcher />
      </div>

      <div className="auth-page__content">
        <div className="auth-page__brand">
          <span className="auth-page__brand-tick">Tick</span>
          <span className="auth-page__brand-flix">Flix</span>
        </div>

        <p className="auth-page__tagline">
          {t("tagline")} <Ticket className="auth-page__tagline-icon" size={22} />
        </p>

        <form className="auth-page__form" onSubmit={auth.submit}>
          {fieldsOf(mode, t).map((field) => (
            <input
              key={`${mode}-${field.name}`}
              className="auth-page__input"
              type={field.type}
              value={auth.values[field.name as keyof typeof auth.values]}
              onChange={(e) => auth.setValue(field.name as keyof typeof auth.values, e.target.value)}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              disabled={auth.submitting}
            />
          ))}

          {auth.passwordsDontMatch && <p className="auth-page__error">{t("auth.passwordsDontMatch")}</p>}
          {auth.error && <p className="auth-page__error">{auth.error}</p>}

          <div className="auth-page__footer">
            <Button type="submit" disabled={!auth.valid} loading={auth.submitting}>
              {isLogin ? t("auth.accessButton") : t("auth.createAccountButton")}
            </Button>

            <p className="auth-page__signup">
              {isLogin ? t("auth.noAccount") : t("auth.alreadyHaveAccount")}{" "}
              <button type="button" className="auth-page__signup-link" onClick={() => auth.setMode(isLogin ? "signup" : "login")}>
                {isLogin ? t("auth.openAccount") : t("auth.signIn")}
              </button>
            </p>
          </div>
        </form>

        <div className="auth-page__divider">
          <span>{t("auth.or")}</span>
        </div>

        <Button type="button" variant="ghost" className="auth-page__google-button" onClick={auth.signInWithGoogle} loading={auth.googleSubmitting} disabled={auth.submitting}>
          {!auth.googleSubmitting && <GoogleIcon size={18} />}
          {t("auth.continueWithGoogle")}
        </Button>
      </div>

      {highlight && (
        <div className="auth-page__badge" title={highlight.info}>
          <Info size={16} />
          <span>{t("auth.movieLabel", { name: highlight.name })}</span>
        </div>
      )}

      {auth.bgLoading && (
        <div className="auth-page__badge auth-page__badge--loading">
          <Loader2 className="auth-page__badge-spinner" size={14} />
        </div>
      )}
    </div>
  );
};

export default Auth;
