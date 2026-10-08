import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { collection, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, type AuthError } from "firebase/auth";
import { auth, db } from "@/service/FirebaseSettings";

type AuthMode = "login" | "signup";

interface Highlight {
  image_url: string;
  name: string;
  info: string;
}

// Código de erro do Firebase -> chave de tradução.
const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-email": "auth.errors.invalidEmail",
  "auth/user-not-found": "auth.errors.wrongCredentials",
  "auth/invalid-credential": "auth.errors.wrongCredentials",
  "auth/wrong-password": "auth.errors.wrongCredentials",
  "auth/too-many-requests": "auth.errors.tooManyRequests",
  "auth/email-already-in-use": "auth.errors.emailInUse",
  "auth/weak-password": "auth.errors.weakPassword",
  "auth/popup-blocked": "auth.errors.popupBlocked",
  "auth/account-exists-with-different-credential": "auth.errors.accountExistsDifferentCredential",
};

// Fechar o popup do Google não é erro: não mostra mensagem.
const GOOGLE_DISMISSED = ["auth/popup-closed-by-user", "auth/cancelled-popup-request"];

// Ciclo "entrar / criar conta": preencher -> entrar (e-mail/senha ou Google) ou criar a conta; o fundo mostra um filme em destaque sorteado.
// usado na página de Login.
export const useAuthPage = () => {
  const { t } = useTranslation();
  const [mode, setModeState] = useState<AuthMode>("login");
  const [values, setValues] = useState({ email: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [bgLoading, setBgLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "highlight"))
      .then((snapshot) => {
        const docs = snapshot.docs.map((d) => d.data() as Highlight);
        setHighlight(docs.length > 0 ? docs[Math.floor(Math.random() * docs.length)] : null);
      })
      .catch((err) => console.error("Erro ao buscar destaque:", err))
      .finally(() => setBgLoading(false));
  }, []);

  const { email, password, confirm } = values;
  const valid = mode === "login" ? email.trim().length > 0 && password.length > 0 : email.includes("@") && password.length >= 6 && password === confirm;

  const setMode = (next: AuthMode) => {
    setModeState(next);
    setError(null);
  };

  // Roda uma tentativa de entrada mostrando o carregando e traduzindo o erro do Firebase.
  const attempt = async (action: () => Promise<unknown>, setBusy: (busy: boolean) => void) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      const code = (err as AuthError)?.code;
      if (!GOOGLE_DISMISSED.includes(code)) setError(t(AUTH_ERRORS[code] ?? "auth.errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const run = mode === "login" ? () => signInWithEmailAndPassword(auth, email.trim(), password) : () => createUserWithEmailAndPassword(auth, email.trim(), password);
    attempt(run, setSubmitting);
  };

  return {
    mode,
    setMode,
    values,
    setValue: (field: keyof typeof values, value: string) => setValues((prev) => ({ ...prev, [field]: value })),
    passwordsDontMatch: mode === "signup" && password.length > 0 && confirm.length > 0 && password !== confirm,
    valid,
    error,
    submitting,
    googleSubmitting,
    highlight,
    bgLoading,
    submit,
    signInWithGoogle: () => attempt(() => signInWithPopup(auth, new GoogleAuthProvider()), setGoogleSubmitting),
  };
};
