// src/pages/private/profile/index.tsx
// "Meu perfil" — item novo do menu da conta (@/components/userMenu),
// pedido explícito da Rebecca: "da uma olhada lá no menu de usuário do
// projeto mailbook [livro-app]... vamos fazer o mesmo aqui no tickflix".
// Pedido seguinte, mais específico, depois de ver a tela básica: "segue o
// padrão do outro projeto.. ou seja, trocar o nome, link da imagem,
// categorias preferidas de filmes e séries e ai pode colocar quantidade
// de filmes vistos, quantidade de séries vistas, quantidade de [animes]
// vistas" — três seções, mesma estrutura do livro-app (ver
// ProfilePage de lá): identidade editável, preferências, estatísticas.
//
// Sem store global de auth no app (ver comentário em
// @/components/userMenu) — lê/edita `auth.currentUser` direto. Avatar é
// só por LINK (sem upload próprio), mesma escolha do mailbook — campo
// vazio manda `null` pro Firebase, volta a mostrar a inicial do nome.
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/service/FirebaseSettings";
import { getUserGenres, setUserGenres } from "@/service/UserPreferencesSettings";
import Avatar from "@/components/avatar";
import Button from "@/components/button";
import { PREFERRED_GENRES, fetchWatchedStats, formatMemberSince, isNameValid, saveProfile, type WatchedStats } from "./functions";
import "./styles.scss";

const Profile = () => {
  const { t } = useTranslation();
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL ?? "");
  const [genres, setGenres] = useState<string[]>(getUserGenres);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<WatchedStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchWatchedStats(user.uid)
      .then(setStats)
      .catch((err) => {
        console.error("Erro ao buscar estatísticas de já vi:", err);
        setStatsError(true);
      });
  }, [user]);

  const memberSince = formatMemberSince(user?.metadata.creationTime);
  const initialGenres = getUserGenres();
  const isValid = isNameValid(name);
  const isDirty =
    name.trim() !== (user?.displayName ?? "").trim() ||
    avatarUrl.trim() !== (user?.photoURL ?? "").trim() ||
    genres.length !== initialGenres.length ||
    genres.some((g) => !initialGenres.includes(g));

  const toggleGenre = (genre: string) => {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
    setSaved(false);
  };

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        <h1 className="profile-page__title">{t("profile.title")}</h1>

        <div className="profile-page__card">
          <Avatar name={name || user?.email || t("userMenu.defaultName")} imageUrl={avatarUrl} size={72} />

          <form className="profile-page__form" onSubmit={handleSubmit}>
            <label className="profile-page__field">
              <span className="profile-page__label">{t("profile.nameLabel")}</span>
              <input
                type="text"
                className="profile-page__input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                placeholder={t("profile.namePlaceholder")}
                disabled={saving}
              />
            </label>

            <label className="profile-page__field">
              <span className="profile-page__label">{t("profile.emailLabel")}</span>
              <input type="email" className="profile-page__input" value={user?.email ?? ""} disabled readOnly />
            </label>

            <label className="profile-page__field">
              <span className="profile-page__label">{t("profile.avatarLabel")}</span>
              <input
                type="url"
                className="profile-page__input"
                value={avatarUrl ?? ""}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setSaved(false);
                }}
                placeholder={t("profile.avatarPlaceholder")}
                disabled={saving}
              />
            </label>

            <fieldset className="profile-page__genres">
              <legend className="profile-page__label">{t("profile.genresTitle")}</legend>
              <p className="profile-page__hint">{t("profile.genresHint")}</p>
              <div className="profile-page__genres-list">
                {PREFERRED_GENRES.map((genre) => {
                  const active = genres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      className={active ? "profile-page__genre profile-page__genre--active" : "profile-page__genre"}
                      aria-pressed={active}
                      onClick={() => toggleGenre(genre)}
                      disabled={saving}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {memberSince && <p className="profile-page__hint">{t("profile.memberSince", { date: memberSince })}</p>}

            {error && <p className="profile-page__error">{error}</p>}
            {saved && !error && <p className="profile-page__success">{t("profile.saveSuccess")}</p>}

            <Button type="submit" disabled={!isValid || !isDirty} loading={saving}>
              {t("profile.save")}
            </Button>
          </form>
        </div>

        <div className="profile-page__card profile-page__card--stats">
          <h2 className="profile-page__stats-title">{t("profile.statsTitle")}</h2>

          {statsError && <p className="profile-page__error">{t("profile.statsError")}</p>}

          {!statsError && (
            <div className="profile-page__stats-grid">
              <div className="profile-page__stat">
                <span className="profile-page__stat-value">{stats ? stats.movies : "–"}</span>
                <span className="profile-page__stat-label">{t("profile.statsMovies")}</span>
              </div>
              <div className="profile-page__stat">
                <span className="profile-page__stat-value">{stats ? stats.series : "–"}</span>
                <span className="profile-page__stat-label">{t("profile.statsSeries")}</span>
              </div>
              <div className="profile-page__stat">
                <span className="profile-page__stat-value">{stats ? stats.animes : "–"}</span>
                <span className="profile-page__stat-label">{t("profile.statsAnimes")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
