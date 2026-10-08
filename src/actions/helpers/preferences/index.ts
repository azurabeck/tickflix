import { auth } from "@/service/FirebaseSettings";

const storageKey = (uid: string, name: string): string => `tickflix-user-${uid}-${name}`;

const read = (uid: string, name: string): string => {
  try {
    return localStorage.getItem(storageKey(uid, name)) ?? "";
  } catch {
    return "";
  }
};

const write = (uid: string, name: string, value: string): void => {
  try {
    if (value) localStorage.setItem(storageKey(uid, name), value);
    else localStorage.removeItem(storageKey(uid, name));
  } catch {
    // localStorage indisponível (ex.: aba anônima): segue sem salvar
  }
};

// Gêneros preferidos do usuário, guardados neste navegador.
// usado em: helpers/aisuggestion, profile/myprofile
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

// Guarda os gêneros preferidos do usuário neste navegador.
// usado em: profile/myprofile
export const setUserGenres = (genres: string[]): void => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  write(uid, "genres", genres.length ? JSON.stringify(genres) : "");
};
