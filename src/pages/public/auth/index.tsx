// src/pages/public/auth/index.tsx
// Pagina de login/cadastro. O fundo e uma foto de destaque (cartaz/still de
// filme em cartaz) lida da collection "highlight" do Firestore — cada doc
// tem `image_url`, `name` (titulo do filme) e `info`. Sorteia um doc entre
// os disponiveis toda vez que a pagina monta.
//
// DOIS modos na MESMA tela (`mode`, abaixo) — pedido explícito da Rebecca:
// "vamos criar uma area para usuário fazer uma conta, ou logar com
// google". O link "Abra sua conta" (que já existia, só sem função — TODO
// antigo) agora alterna pra um formulário de cadastro (e-mail/senha/
// confirmar senha) em vez de levar pra uma rota separada; o Google entra
// como MAIS uma opção, visível nos dois modos (funciona igual pra quem já
// tem conta e pra quem nunca logou — o Firebase cria a conta sozinho no
// primeiro login via Google). `onAuthStateChanged` (App.tsx) já redireciona
// pra Home sozinho assim que qualquer um dos três fluxos resolve — essa
// página não navega manualmente em sucesso nenhum.
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Ticket, Info, Loader2 } from "lucide-react";
import { collection, getDocs, type FirestoreError } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, type AuthError } from "firebase/auth";
import { auth, db } from "@/service/FirebaseSettings";
import Button from "@/components/button";
import LanguageSwitcher from "@/components/languageSwitcher";
import { mapAuthError, pickRandomHighlight, isLoginFormValid, isSignupFormValid, type Highlight } from "./functions";
import "./styles.scss";

type AuthMode = "login" | "signup";

// Clique fora/Esc na janela do Google ("fechou sem escolher conta") não é
// um erro de verdade — não deveria acender a mensagem vermelha.
const isDismissedPopupError = (error: unknown): boolean => {
  const code = (error as AuthError)?.code;
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
};

// Logo oficial do Google ("G" colorido) — lucide-react não tem ícones de
// marca, então é um SVG inline (mesmo recurso que o resto do app usa só
// pra ícones genéricos, aqui é o único lugar com uma marca de terceiro).
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

const Auth = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupSenha, setSignupSenha] = useState("");
  const [signupConfirmarSenha, setSignupConfirmarSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [bgLoading, setBgLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getDocs(collection(db, "highlight"))
      .then((snapshot) => {
        if (cancelled) return;
        setHighlight(pickRandomHighlight(snapshot));
      })
      .catch((err: FirestoreError) => {
        // Sem destaque nao quebra o login — a pagina cai pro fundo padrao.
        console.error("Erro ao buscar destaque:", err);
      })
      .finally(() => {
        if (!cancelled) setBgLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoginValid = isLoginFormValid(usuario, senha);
  const isSignupValid = isSignupFormValid(signupEmail, signupSenha, signupConfirmarSenha);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null); // troca de aba não deveria carregar o erro da aba anterior
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoginValid) return;

    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, usuario.trim(), senha);
    } catch (err) {
      setError(t(mapAuthError(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSignupValid) return;

    setError(null);
    setSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupSenha);
    } catch (err) {
      setError(t(mapAuthError(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (!isDismissedPopupError(err)) setError(t(mapAuthError(err)));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className="auth-page__bg"
        style={highlight ? { backgroundImage: `url(${highlight.image_url})` } : undefined}
      />
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

        {mode === "login" ? (
          <form className="auth-page__form" onSubmit={handleLogin}>
            <input
              className="auth-page__input"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder={t("auth.usernamePlaceholder")}
              autoComplete="username"
              disabled={submitting}
            />
            <input
              className="auth-page__input"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              autoComplete="current-password"
              disabled={submitting}
            />

            {error && <p className="auth-page__error">{error}</p>}

            <div className="auth-page__footer">
              <Button type="submit" disabled={!isLoginValid} loading={submitting}>
                {t("auth.accessButton")}
              </Button>

              <p className="auth-page__signup">
                {t("auth.noAccount")}{" "}
                <button type="button" className="auth-page__signup-link" onClick={() => switchMode("signup")}>
                  {t("auth.openAccount")}
                </button>
              </p>
            </div>
          </form>
        ) : (
          <form className="auth-page__form" onSubmit={handleSignup}>
            <input
              className="auth-page__input"
              type="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              disabled={submitting}
            />
            <input
              className="auth-page__input"
              type="password"
              value={signupSenha}
              onChange={(e) => setSignupSenha(e.target.value)}
              placeholder={t("auth.createPasswordPlaceholder")}
              autoComplete="new-password"
              disabled={submitting}
            />
            <input
              className="auth-page__input"
              type="password"
              value={signupConfirmarSenha}
              onChange={(e) => setSignupConfirmarSenha(e.target.value)}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              autoComplete="new-password"
              disabled={submitting}
            />

            {signupSenha.length > 0 && signupConfirmarSenha.length > 0 && signupSenha !== signupConfirmarSenha && (
              <p className="auth-page__error">{t("auth.passwordsDontMatch")}</p>
            )}
            {error && <p className="auth-page__error">{error}</p>}

            <div className="auth-page__footer">
              <Button type="submit" disabled={!isSignupValid} loading={submitting}>
                {t("auth.createAccountButton")}
              </Button>

              <p className="auth-page__signup">
                {t("auth.alreadyHaveAccount")}{" "}
                <button type="button" className="auth-page__signup-link" onClick={() => switchMode("login")}>
                  {t("auth.signIn")}
                </button>
              </p>
            </div>
          </form>
        )}

        <div className="auth-page__divider">
          <span>{t("auth.or")}</span>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="auth-page__google-button"
          onClick={handleGoogleSignIn}
          loading={googleSubmitting}
          disabled={submitting}
        >
          {!googleSubmitting && <GoogleIcon size={18} />}
          {t("auth.continueWithGoogle")}
        </Button>
      </div>

      {highlight && (
        <div className="auth-page__badge" title={highlight.info}>
          <Info size={16} />
          <span>{t("auth.movieLabel", { name: highlight.name })}</span>
        </div>
      )}

      {bgLoading && (
        <div className="auth-page__badge auth-page__badge--loading">
          <Loader2 className="auth-page__badge-spinner" size={14} />
        </div>
      )}
    </div>
  );
};

export default Auth;
