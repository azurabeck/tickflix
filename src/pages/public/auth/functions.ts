// src/pages/public/auth/functions.ts
import type { AuthError } from "firebase/auth";
import type { QuerySnapshot, DocumentData } from "firebase/firestore";

export interface Highlight {
  image_url: string;
  name: string;
  info: string;
}

// Login aceita e-mail/senha E Google (pedido explícito da Rebecca: "vamos
// criar uma area para usuário fazer uma conta, ou logar com google") — o
// rotulo do campo de login diz "usuário" pra bater com o mockup, mas o
// valor digitado e enviado como e-mail pro Firebase Auth.
//
// Devolve uma CHAVE de tradução (`auth.errors.*`, ver src/locales), não o
// texto final — i18n só funciona dentro de componente (`useTranslation`),
// essa função fica fora de um. Quem chama faz `t(mapAuthError(err))`.
export const mapAuthError = (error: unknown): string => {
  const code = (error as AuthError)?.code;
  switch (code) {
    case "auth/invalid-email":
      return "auth.errors.invalidEmail";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "auth.errors.wrongCredentials";
    case "auth/too-many-requests":
      return "auth.errors.tooManyRequests";
    case "auth/email-already-in-use":
      return "auth.errors.emailInUse";
    case "auth/weak-password":
      return "auth.errors.weakPassword";
    case "auth/popup-blocked":
      return "auth.errors.popupBlocked";
    case "auth/account-exists-with-different-credential":
      return "auth.errors.accountExistsDifferentCredential";
    default:
      return "auth.errors.generic";
  }
};

// Cadastro — mesma validação mínima do Firebase (senha >= 6 caracteres,
// ver auth/weak-password acima) conferida já no client pra não gastar
// uma chamada ao Firebase com um pedido que ele mesmo vai recusar.
export const isSignupFormValid = (email: string, senha: string, confirmarSenha: string): boolean =>
  email.trim().length > 0 && email.includes("@") && senha.length >= 6 && senha === confirmarSenha;

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
