import { useTranslation } from "react-i18next";
import Avatar from "@/components/atoms/Avatar";
import Button from "@/components/atoms/Button";
import Card from "@/components/atoms/Card";
import StatusMessage from "@/components/atoms/StatusMessage";
import { PREFERRED_GENRES, useMyProfile } from "@/actions/profile/myprofile";
import "./style.scss";

// Formulário do perfil: avatar, nome, e-mail (somente leitura), foto e gêneros preferidos.
const ProfileForm = () => {
  const { t } = useTranslation();
  const form = useMyProfile();
  const { user, name, avatarUrl, genres, saving } = form;

  return (
    <Card layout="row" size="lg">
      <Avatar name={name || user?.email || t("userMenu.defaultName")} imageUrl={avatarUrl} size={72} />

      <form className="profile-form" onSubmit={form.submit}>
        <label className="profile-form__field">
          <span className="profile-form__label">{t("profile.nameLabel")}</span>
          <input type="text" className="profile-form__input" value={name} onChange={(e) => form.setName(e.target.value)} placeholder={t("profile.namePlaceholder")} disabled={saving} />
        </label>

        <label className="profile-form__field">
          <span className="profile-form__label">{t("profile.emailLabel")}</span>
          <input type="email" className="profile-form__input" value={user?.email ?? ""} disabled readOnly />
        </label>

        <label className="profile-form__field">
          <span className="profile-form__label">{t("profile.avatarLabel")}</span>
          <input type="url" className="profile-form__input" value={avatarUrl ?? ""} onChange={(e) => form.setAvatarUrl(e.target.value)} placeholder={t("profile.avatarPlaceholder")} disabled={saving} />
        </label>

        <fieldset className="profile-form__genres">
          <legend className="profile-form__label">{t("profile.genresTitle")}</legend>
          <p className="profile-form__hint">{t("profile.genresHint")}</p>
          <div className="profile-form__genres-list">
            {PREFERRED_GENRES.map((genre) => {
              const active = genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  className={active ? "profile-form__genre profile-form__genre--active" : "profile-form__genre"}
                  aria-pressed={active}
                  onClick={() => form.toggleGenre(genre)}
                  disabled={saving}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </fieldset>

        {form.memberSince && <p className="profile-form__hint">{t("profile.memberSince", { date: form.memberSince })}</p>}

        {form.error && (
          <StatusMessage variant="error" compact>
            {form.error}
          </StatusMessage>
        )}
        {form.saved && !form.error && (
          <StatusMessage variant="success" compact>
            {t("profile.saveSuccess")}
          </StatusMessage>
        )}

        <Button type="submit" disabled={!form.isValid || !form.isDirty} loading={saving}>
          {t("profile.save")}
        </Button>
      </form>
    </Card>
  );
};

export default ProfileForm;
