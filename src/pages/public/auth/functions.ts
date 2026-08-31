// src/pages/public/auth/functions.ts
import type { AuthError } from "firebase/auth";
import type { QuerySnapshot, DocumentData } from "firebase/firestore";

export interface Highlight {
  image_url: string;
  name: string;
  info: string;
}

// Login so aceita e-mail/senha por enquanto (unico provider configurado no
// Firebase do projeto) — o rotulo do campo diz "usuário" pra bater com o
// mockup, mas o valor digitado e enviado como e-mail pro Firebase Auth.
export const mapAuthError = (error: unknown): string => {
  const code = (error as AuthError)?.code;
  switch (code) {
    case "auth/invalid-email":
      return "Usuário inválido.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Usuário ou senha incorretos.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente em instantes.";
    default:
      return "Não foi possível entrar. Tente novamente.";
  }
};

/** Sorteia um destaque entre os docs retornados pela collection "highlight". */
export const pickRandomHighlight = (
  snapshot: QuerySnapshot<DocumentData>
): Highlight | null => {
  if (snapshot.empty) return null;
  const docs = snapshot.docs.map((doc) => doc.data() as Highlight);
  return docs[Math.floor(Math.random() * docs.length)];
};

export const isLoginFormValid = (usuario: string, senha: string): boolean =>
  usuario.trim().length > 0 && senha.length > 0;
