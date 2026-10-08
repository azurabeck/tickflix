import { useTranslation } from "react-i18next";
import Card from "@/components/atoms/Card";
import StatusMessage from "@/components/atoms/StatusMessage";
import { useStatistics } from "@/actions/profile/statistics";
import "./style.scss";

interface ProfileStatsProps {
  uid: string | undefined;
}

// Quantos filmes, séries e animes o usuário já viu.
const ProfileStats = ({ uid }: ProfileStatsProps) => {
  const { t } = useTranslation();
  const { stats, error } = useStatistics(uid);

  const items = [
    { value: stats?.movies, label: t("profile.statsMovies") },
    { value: stats?.series, label: t("profile.statsSeries") },
    { value: stats?.animes, label: t("profile.statsAnimes") },
  ];

  return (
    <Card size="lg" className="profile-stats">
      <h2 className="profile-stats__title">{t("profile.statsTitle")}</h2>

      {error ? (
        <StatusMessage variant="error" compact>
          {t("profile.statsError")}
        </StatusMessage>
      ) : (
        <div className="profile-stats__grid">
          {items.map((item) => (
            <div key={item.label} className="profile-stats__stat">
              <span className="profile-stats__value">{item.value ?? "–"}</span>
              <span className="profile-stats__label">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ProfileStats;
