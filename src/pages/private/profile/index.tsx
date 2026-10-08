import { useTranslation } from "react-i18next";
import PageShell from "@/components/atoms/PageShell";
import ProfileForm from "@/components/organisms/ProfileForm";
import ProfileStats from "@/components/organisms/ProfileStats";
import { auth } from "@/service/FirebaseSettings";

const Profile = () => {
  const { t } = useTranslation();

  return (
    <PageShell title={t("profile.title")}>
      <ProfileForm />
      <ProfileStats uid={auth.currentUser?.uid} />
    </PageShell>
  );
};

export default Profile;
