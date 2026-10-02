// src/service/UserPreferencesSettings.ts
// Preferências do usuário que ficam só no navegador (localStorage),
// separadas por uid — mesmo padrão já usado pra chave do Gemini
// (service/IASettings.ts, `getUserGeminiKey`/`setUserGeminiKey`), pedido
// explícito da Rebecca pra seguir a mesma estrutura do projeto "mailbook"
// (livro-app, `services/userSettings.ts` de lá). Gênero preferido não é
// dado sensível nem precisa sincronizar entre dispositivos — localStorage
// evita gravar no Firestore por algo puramente cosmético/de preferência.
import { auth } from "./FirebaseSettings";

const storageKey = (uid: string, name: string): string => `tickflix-user-${uid}-${name}`;

const read = (uid: string, name: string): string => {
  try {
    return localStorage.getItem(storageKey(uid, name)) ?? "";
  } catch {
    return ""; // localStorage indisponível (aba anônima etc.)
  }
};

const write = (uid: string, name: string, value: string): void => {
  try {
    if (value) localStorage.setItem(storageKey(uid, name), value);
    else localStorage.removeItem(storageKey(uid, name));
  } catch {
    // não é crítico, ignora
  }
};

export const getUserGenres = (): string[] => {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  try {
    const parsed = JSON.parse(read(uid, "genres") || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export const setUserGenres = (genres: string[]): void => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  write(uid, "genres", genres.length ? JSON.stringify(genres) : "");
};
