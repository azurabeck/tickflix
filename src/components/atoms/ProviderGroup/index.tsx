import { TMDB_LOGO_BASE } from "@/service/TMDbSettings";
import type { WatchProvider } from "@/actions/helpers/moviedetail";
import "./style.scss";

interface ProviderGroupProps {
  label: string;
  list: WatchProvider[];
}

const ProviderGroup = ({ label, list }: ProviderGroupProps) => {
  if (list.length === 0) return null;

  return (
    <div className="provider-group">
      <span className="provider-group__label">{label}</span>
      <div className="provider-group__logos">
        {list.map((provider) =>
          provider.logoPath ? (
            <img key={provider.id} src={`${TMDB_LOGO_BASE}${provider.logoPath}`} alt={provider.name} title={provider.name} className="provider-group__logo" />
          ) : (
            <span key={provider.id} title={provider.name} className="provider-group__logo provider-group__logo--empty">
              {provider.name.slice(0, 1)}
            </span>
          )
        )}
      </div>
    </div>
  );
};

export default ProviderGroup;
