// src/service/FirebaseSettings.ts
// Inicializacao central do Firebase. Todo o resto da aplicacao deve
// importar `db`/`auth` a partir deste arquivo, nunca chamar initializeApp
// em outro lugar.
//
// Config vem de variaveis de ambiente (.env, fora do git — ver .env.example
// pro template) em vez de hardcoded aqui. Nao sao segredos de verdade (o
// apiKey de config web do Firebase e publico por design; quem protege os
// dados sao as regras de seguranca do Firestore, nao esconder esse valor),
// mas manter fora do codigo facilita trocar de projeto/ambiente sem editar
// fonte.

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app: FirebaseApp = initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);

export const auth: Auth = getAuth(app);

// getAnalytics falha em ambientes sem suporte (SSR, alguns navegadores).
// isSupported() evita quebrar o app nesses casos.
export let analytics: Analytics | undefined;
isSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => {
    analytics = undefined;
  });
