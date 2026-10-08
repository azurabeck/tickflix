// Substitui src/service/FirebaseSettings no Storybook: usuário de exemplo e banco em memória (ver firestore.ts).
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

export const db = {} as Firestore;

export const auth = {
  currentUser: {
    uid: "demo",
    displayName: "Rebecca Souza",
    email: "rebecca@exemplo.com",
    photoURL: null,
    metadata: { creationTime: "2025-03-10T12:00:00Z" },
  },
} as unknown as Auth;
