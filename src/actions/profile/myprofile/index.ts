import { useState, type FormEvent } from "react";
import { updateProfile, type User } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { auth } from "@/service/FirebaseSettings";
import { getUserGenres, setUserGenres } from "@/actions/helpers/preferences";

const isNameValid = (name: string): boolean => name.trim().length > 0;

const saveProfile = (user: User, name: string, avatarUrl: string): Promise<void> =>
  updateProfile(user, { displayName: name.trim(), photoURL: avatarUrl.trim() || null });

const formatMemberSince = (creationTime: string | undefined): string | null => {
  if (!creationTime) return null;
  const date = new Date(creationTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

// Gêneros que o usuário pode marcar como preferidos.
// usado em: ProfileForm
export const PREFERRED_GENRES = [
  "Ação",
  "Animação",
  "Aventura",
  "Comédia",
  "Crime",
  "Documentário",
  "Drama",
  "Faroeste",
  "Fantasia",
  "Ficção científica",
  "Guerra",
  "História",
  "Mistério",
  "Música",
  "Romance",
  "Terror",
  "Thriller",
] as const;

// Ciclo "editar perfil": nome, avatar e gêneros preferidos; só habilita salvar quando algo mudou.
// usado em: ProfileForm
export const useMyProfile = () => {
  const { t } = useTranslation();
  const user = auth.currentUser;
  const [name, setNameState] = useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrlState] = useState(user?.photoURL ?? "");
  const [genres, setGenres] = useState<string[]>(getUserGenres);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialGenres = getUserGenres();
  const isValid = isNameValid(name);
  const isDirty =
    name.trim() !== (user?.displayName ?? "").trim() ||
    avatarUrl.trim() !== (user?.photoURL ?? "").trim() ||
    genres.length !== initialGenres.length ||
    genres.some((g) => !initialGenres.includes(g));

  const setName = (value: string) => {
    setNameState(value);
    setSaved(false);
  };
  const setAvatarUrl = (value: string) => {
    setAvatarUrlState(value);
    setSaved(false);
  };
  const toggleGenre = (genre: string) => {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
    setSaved(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !isValid || !isDirty || saving) return;

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfile(user, name, avatarUrl);
      setUserGenres(genres);
      setSaved(true);
    } catch (err) {
      console.error("Erro ao salvar o perfil:", err);
      setError(t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return {
    user,
    name,
    setName,
    avatarUrl,
    setAvatarUrl,
    genres,
    toggleGenre,
    saving,
    saved,
    error,
    isValid,
    isDirty,
    memberSince: formatMemberSince(user?.metadata.creationTime),
    submit,
  };
};
