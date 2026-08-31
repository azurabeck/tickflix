// src/pages/public/auth/index.tsx
// Pagina de login. O fundo e uma foto de destaque (cartaz/still de filme em
// cartaz) lida da collection "highlight" do Firestore — cada doc tem
// `image_url`, `name` (titulo do filme) e `info`. Sorteia um doc entre
// os disponiveis toda vez que a pagina monta.
import { useEffect, useState, type FormEvent } from "react";
import { Ticket, Info, Loader2 } from "lucide-react";
import { collection, getDocs, type FirestoreError } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/service/FirebaseSettings";
import { APP_TAGLINE } from "@/service/IASettings";
import Button from "@/components/button";
import { mapAuthError, pickRandomHighlight, isLoginFormValid, type Highlight } from "./functions";
import "./styles.scss";

const Auth = () => {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const isValid = isLoginFormValid(usuario, senha);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, usuario.trim(), senha);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className="auth-page__bg"
        style={highlight ? { backgroundImage: `url(${highlight.image_url})` } : undefined}
      />
      <div className="auth-page__overlay" />

      <div className="auth-page__content">
        <div className="auth-page__brand">
          <span className="auth-page__brand-tick">Tick</span>
          <span className="auth-page__brand-flix">Flix</span>
        </div>

        <p className="auth-page__tagline">
          {APP_TAGLINE} <Ticket className="auth-page__tagline-icon" size={22} />
        </p>

        <form className="auth-page__form" onSubmit={handleSubmit}>
          <input
            className="auth-page__input"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="informe seu usuário"
            autoComplete="username"
            disabled={submitting}
          />
          <input
            className="auth-page__input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="informe sua senha"
            autoComplete="current-password"
            disabled={submitting}
          />

          {error && <p className="auth-page__error">{error}</p>}

          <div className="auth-page__footer">
            <Button type="submit" disabled={!isValid} loading={submitting}>
              Acessar
            </Button>

            <p className="auth-page__signup">
              Ainda não tem um conta?{" "}
              {/* TODO: fluxo de cadastro ainda nao existe — so a tela de
                  login foi pedida nessa primeira etapa. */}
              <button type="button" className="auth-page__signup-link">
                Abra sua conta
              </button>
            </p>
          </div>
        </form>
      </div>

      {highlight && (
        <div className="auth-page__badge" title={highlight.info}>
          <Info size={16} />
          <span>Filme: {highlight.name}</span>
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
